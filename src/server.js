import 'dotenv/config'

// Setup server Express + RBAC + session DB-based
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import router from './routes.js';
import { setupSocket } from '../socketio/socket.js';
import { Controller } from './controllers/controller.js';
import { Server } from 'socket.io';
import { prisma, prismaQuery } from './prisma.js';
import { restoreAllSessions } from './helpers/waService.js';
import { addGetingUncfgJob } from './bull/queues/c320GettingUncfg.js';

const app = express();
const port = process.env.PORT || 3000;

const randomNotify = async (socketIo) => {
    const randomOnus = await prisma.$queryRaw`
        SELECT * FROM "onus"
        ORDER BY RANDOM()
        LIMIT 1;
        `;

    const nextInterval = Math.floor(Math.random() * (10000 - 1000 + 1)) + 1000; // 1-5 detik

    if (randomOnus.length === 0) {
        // schedule next notification
        setTimeout(() => randomNotify(socketIo), nextInterval);
        return;
    }
    const selectSNMPValue = await prismaQuery(() =>
        prisma.snmp_values.findMany({
            where: {
                onu_id: randomOnus[0].id
            }
        })
    );

    if (selectSNMPValue.length > 0) {
        const onuStatus = selectSNMPValue.filter(item => item.metric_key === 'status')[0];
        const onuRx = selectSNMPValue.filter(item => item.metric_key === 'rx')[0];
        switch (onuStatus.value) {
            case "Online":
                onuStatus.value = Math.random() < 0.5 ? 'Offline' : 'LOS';
                break;
            case "Offline":
                onuStatus.value = Math.random() < 0.5 ? 'Online' : 'LOS';
                break;
            case "LOS":
                onuStatus.value = Math.random() < 0.5 ? 'Online' : 'Offline';
                break;
            default:
                onuStatus.value = 'Offline';
                break;
        }

        const randomBetween = (min, max, decimals = 3) => {
            const factor = Math.pow(10, decimals);
            return Math.round((Math.random() * (max - min) + min) * factor) / factor;
        };

        const payload = {
            status: {
                id: onuStatus.id,
                onu_id: onuStatus.onu_id,
                metric_key: onuStatus.metric_key,
                oid: onuStatus.oid,
                value: onuStatus.value
            },
            rx: {
                id: onuRx.id,
                onu_id: onuRx.onu_id,
                metric_key: onuRx.metric_key,
                oid: onuRx.oid,
                value: onuStatus.value === "Online" ? randomBetween(-29, -19, 3) : null
            },
            subscription_id: randomOnus[0].subscription_id,
        };

        socketIo.emit('coverage-notif', JSON.stringify(payload));
        // console.log('sending random notification next is ', nextInterval, 'ms');
        // schedule next notification
        setTimeout(() => randomNotify(socketIo), nextInterval);
    } else {
        // schedule next notification
        randomNotify(socketIo);
    }
}



// use origin-only referrer for cross-origin requests.
const allowedOrigins = [
    "http://localhost:5173",
    "https://demoisp.wahyuwijaya.biz.id",
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.some(o => origin.startsWith(o))) {
            return callback(null, true);
        }
        return callback(new Error("CORS policy: Not allowed"));
    },
    credentials: true
}));

// FIX untuk Express v5 – preflight handler
app.options("/{*path}", cors());



app.use((req, res, next) => {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const server = http.createServer(app);


const socketIo = setupSocket(server);


app.get('/', (req, res) => {
    socketIo.emit('message', 'Hello, client!');
    res.send(new Date());
});
// Mount semua route RBAC + session di /api
app.use('/api', router);

app.post('/socketxyz/internal/emit', (req, res) => {
    // Ensure req.body exists and destructure safely
    const { event, data } = req.body || {};
    // If you need to use io, uncomment the next line
    socketIo.emit(event, JSON.stringify(data));
    res.json({ status: 'success' });
});

app.use((err, req, res, next) => {
    console.error(err); // log ke console / logger
    res.status(500).json({
        status: "error",
        message: err.message || "Internal Server Error",
    });
});


socketIo.on('connection', (socket) => {
    socket.on('message', (data) => {
        console.log('message received from client:', data, socket.id);
        socketIo.emit('message', `Hello, your id is ${socket.id}`);
    });

    socket.on('coverage-notif', (data) => {
        socketIo.emit('coverage-notif', data);
    });

    socket.on('create-onu', (data) => {
        socketIo.emit('create-onu', data);
    });

    socket.on('whatsapp-notif', (data) => {
        socketIo.emit('whatsapp-notif', data);
    });

    socket.on('new-notification', (data) => {
        socketIo.emit('new-notification', data);
    });

    socket.on('update-notification', (data) => {
        socketIo.emit('update-notification', data);
    });
});

app.use((err, req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.error(err); // log ke console / logger
    }
    return Controller.sendResponse(res, err.status || 500, err.message || "Internal Server Error");
});

server.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    // await restoreAllSessions();
    await addGetingUncfgJob();
    randomNotify(socketIo);
});
