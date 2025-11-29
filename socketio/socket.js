import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';

const socketAuth = (socket, next) => {
    try {
        // Ambil token dari cookie atau dari header 'token'
        const cookieHeader = socket.request.headers.cookie || '';
        let token = cookieHeader
            .split(';')
            .map(s => s.trim())
            .find(s => s.startsWith('token='))?.split('=')[1];

        // Jika tidak ada di cookie, cek di header 'token'
        if (!token) {
            token = socket.request.headers['token'];
        }

        if (!token) return next(); // atau next(new Error('No token'))

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.decoded = decoded;
        next();
    } catch (err) {
        next(err);
    }
}

const setupSocket = (socketServer) => {
    try {
        const io = new Server(socketServer, {
            cors: {
                origin: ['https://demoisp.wahyuwijaya.biz.id', 'http://localhost:5173'],
                credentials: true,
            },
        });
        io.use(socketAuth);
        return io;
    } catch (error) {
        console.error('Socket setup error:', error);
    }
}

export { setupSocket };