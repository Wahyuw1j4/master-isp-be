import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

const templates = [
    {
        code: 'invoice_release',
        label: 'Invoice Release Notification',
        body: 'Yth. Bpk/Ibu {{customer_name}},\n\nTagihan internet Anda untuk layanan {{service_name}} dengan nomor invoice {{invoice_no}} telah terbit. Total tagihan sebesar Rp {{total_amount}}.\n\nMohon lakukan pembayaran sebelum tanggal {{due_date}}.\n\nTerima kasih.',
        variables: [
            { key: 'customer_name', label: 'Nama Pelanggan' },
            { key: 'service_name', label: 'Nama Layanan' },
            { key: 'invoice_no', label: 'Nomor Invoice' },
            { key: 'total_amount', label: 'Total Tagihan' },
            { key: 'due_date', label: 'Tanggal Jatuh Tempo' },
        ],
        example_vars: {
            customer_name: "John Doe",
            service_name: "Home 10 Mbps",
            invoice_no: "INV-2023-001",
            total_amount: "150,000",
            due_date: "20/12/2023"
        }
    },
    {
        code: 'invoice_reminder',
        label: 'Invoice Payment Reminder',
        body: 'Yth. Bpk/Ibu {{customer_name}},\n\nIni adalah pengingat untuk tagihan Anda dengan nomor invoice {{invoice_no}} sebesar Rp {{total_amount}} yang akan jatuh tempo pada tanggal {{due_date}}.\n\nMohon segera lakukan pembayaran.\n\nTerima kasih.',
        variables: [
            { key: 'customer_name', label: 'Nama Pelanggan' },
            { key: 'invoice_no', label: 'Nomor Invoice' },
            { key: 'total_amount', label: 'Total Tagihan' },
            { key: 'due_date', label: 'Tanggal Jatuh Tempo' },
        ],
        example_vars: {
            customer_name: "Jane Doe",
            invoice_no: "INV-2023-002",
            total_amount: "250,000",
            due_date: "22/12/2023"
        }
    },
    {
        code: 'invoice_suspend',
        label: 'Service Suspension Notification',
        body: 'Yth. Bpk/Ibu {{customer_name}},\n\nLayanan internet Anda ({{service_name}}) telah kami non-aktifkan sementara karena adanya tagihan yang belum terbayar (Invoice: {{invoice_no}}).\n\nSilakan lakukan pembayaran agar layanan dapat segera kami aktifkan kembali.\n\nTerima kasih.',
        variables: [
            { key: 'customer_name', label: 'Nama Pelanggan' },
            { key: 'service_name', label: 'Nama Layanan' },
            { key: 'invoice_no', label: 'Nomor Invoice' },
        ],
        example_vars: {
            customer_name: "Peter Jones",
            service_name: "Office 50 Mbps",
            invoice_no: "INV-2023-003"
        }
    },
    {
        code: 'invoice_payment_success',
        label: 'Payment Success Notification',
        body: 'Yth. Bpk/Ibu {{customer_name}},\n\nPembayaran Anda untuk invoice {{invoice_no}} telah kami terima. Terima kasih telah melakukan pembayaran tepat waktu.\n\nLayanan Anda akan tetap aktif.',
        variables: [
            { key: 'customer_name', label: 'Nama Pelanggan' },
            { key: 'invoice_no', label: 'Nomor Invoice' },
        ],
        example_vars: {
            customer_name: "Mary Jane",
            invoice_no: "INV-2023-004"
        }
    },
    {
        code: 'ticket_subs_notif',
        label: 'New Subscription Ticket Notification',
        body: 'Tiket baru telah dibuat.\n\nID Tiket: {{ticket_id}}\nLangganan: {{subscription_id}}\nSubjek: {{subject}}\n\nTim teknisi akan segera menindaklanjuti.',
        variables: [
            { key: 'ticket_id', label: 'ID Tiket' },
            { key: 'subscription_id', label: 'ID Langganan' },
            { key: 'subject', label: 'Subjek Masalah' },
        ],
        example_vars: {
            ticket_id: "TICKET-001",
            subscription_id: "SUB-001",
            subject: "Internet Lambat"
        }
    },
    {
        code: 'ticket_site_notif',
        label: 'New Site Ticket Notification',
        body: 'Tiket maintenance lokasi baru telah dibuat.\n\nID Tiket: {{ticket_id}}\nLokasi: {{site_name}}\nMasalah: {{problem}}\n\nMohon untuk segera ditangani.',
        variables: [
            { key: 'ticket_id', label: 'ID Tiket' },
            { key: 'site_name', label: 'Nama Lokasi' },
            { key: 'problem', label: 'Laporan Masalah' },
        ],
        example_vars: {
            ticket_id: "TICKET-SITE-001",
            site_name: "ODP-CLG-01",
            problem: "Kabel putus"
        }
    },
];

async function main() {
    console.log(`Start seeding whatsapp_template...`);

    for (const t of templates) {
        const existing = await prisma.whatsapp_template.findUnique({
            where: { code: t.code },
        });

        if (existing) {
            console.log(`Template "${t.code}" already exists, skipping.`);
            continue;
        }

        const created = await prisma.whatsapp_template.create({
            data: {
                code: t.code,
                label: t.label,
                body: t.body,
                example_vars: t.example_vars || undefined,
                variables: {
                    create: t.variables.map(v => ({
                        key: v.key,
                        label: v.label,
                    })),
                },
            },
        });
        console.log(`Created template with id: ${created.id}`);
    }

    console.log(`Seeding finished.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
