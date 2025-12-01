export function generateInvoiceHtml(invoice, formatCurrency) {
    return `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.invoice_no}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #3498db;
        }
        .company-info h1 {
            color: #3498db;
            font-size: 28px;
            margin-bottom: 5px;
        }
        .company-info p {
            color: #666;
            font-size: 12px;
        }
        .invoice-info {
            text-align: right;
        }
        .invoice-info h2 {
            color: #333;
            font-size: 24px;
            margin-bottom: 10px;
        }
        .invoice-info p {
            color: #666;
            font-size: 12px;
            margin-bottom: 3px;
        }
        .invoice-info .invoice-no {
            font-size: 14px;
            font-weight: bold;
            color: #333;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            margin-top: 10px;
        }
        .status-paid {
            background-color: #27ae60;
            color: white;
        }
        .status-unpaid {
            background-color: #e74c3c;
            color: white;
        }
        .status-pending {
            background-color: #f39c12;
            color: white;
        }
        .customer-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .customer-info, .payment-info {
            width: 48%;
        }
        .section-title {
            font-size: 12px;
            color: #999;
            text-transform: uppercase;
            margin-bottom: 10px;
            font-weight: bold;
        }
        .customer-info h3, .payment-info h3 {
            color: #333;
            font-size: 16px;
            margin-bottom: 5px;
        }
        .customer-info p, .payment-info p {
            color: #666;
            font-size: 13px;
            margin-bottom: 3px;
        }
        .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .invoice-table th {
            background-color: #3498db;
            color: white;
            padding: 12px 15px;
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
        }
        .invoice-table th:last-child,
        .invoice-table td:last-child {
            text-align: right;
        }
        .invoice-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #eee;
            font-size: 13px;
            color: #333;
        }
        .invoice-table tbody tr:hover {
            background-color: #f9f9f9;
        }
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
        }
        .totals-table {
            width: 300px;
        }
        .totals-table tr td {
            padding: 8px 0;
            font-size: 13px;
        }
        .totals-table tr td:first-child {
            color: #666;
        }
        .totals-table tr td:last-child {
            text-align: right;
            font-weight: 500;
            color: #333;
        }
        .totals-table tr.grand-total td {
            font-size: 18px;
            font-weight: bold;
            color: #3498db;
            border-top: 2px solid #3498db;
            padding-top: 15px;
        }
        .payment-details {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .payment-details h4 {
            color: #333;
            margin-bottom: 10px;
            font-size: 14px;
        }
        .payment-details p {
            color: #666;
            font-size: 13px;
            margin-bottom: 5px;
        }
        .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        .footer p {
            color: #999;
            font-size: 12px;
            margin-bottom: 5px;
        }
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .invoice-container {
                box-shadow: none;
                padding: 20px;
            }
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <div class="company-info">
                <h1>ISP Billing</h1>
                <p>Internet Service Provider</p>
            </div>
            <div class="invoice-info">
                <h2>INVOICE</h2>
                <p class="invoice-no">${invoice.invoice_no}</p>
                <p>Tanggal: ${new Date(invoice.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <span class="status-badge status-${invoice.status === 'paid' ? 'paid' : invoice.status === 'pending' ? 'pending' : 'unpaid'}">
                    ${(invoice.status || 'unpaid').toUpperCase()}
                </span>
            </div>
        </div>

        <div class="customer-section">
            <div class="customer-info">
                <p class="section-title">Tagihan Kepada</p>
                <h3>${invoice.customer?.name || '-'}</h3>
                <p>${invoice.customer?.address || '-'}</p>
                <p>Telp: ${invoice.customer?.phone || '-'}</p>
                <p>Email: ${invoice.customer?.email || '-'}</p>
            </div>
            <div class="payment-info">
                <p class="section-title">Informasi Layanan</p>
                <h3>${invoice.subscription?.service?.name || 'Layanan Internet'}</h3>
                <p>Kecepatan: ${invoice.subscription?.service?.speed || '-'} Mbps</p>
            </div>
        </div>

        <table class="invoice-table">
            <thead>
                <tr>
                    <th style="width: 50%">Deskripsi</th>
                    <th style="width: 15%">Qty</th>
                    <th style="width: 17.5%">Harga</th>
                    <th style="width: 17.5%">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${invoice.invoice_details && invoice.invoice_details.length > 0
                    ? invoice.invoice_details.map(detail => `
                        <tr>
                            <td>${detail.billing_name || '-'}</td>
                            <td>1</td>
                            <td>${formatCurrency(detail.billing_price)}</td>
                            <td>${formatCurrency(detail.billing_price)}</td>
                        </tr>
                    `).join('')
                    : `
                        <tr>
                            <td>${invoice.subscription?.service?.name || 'Layanan Internet'}</td>
                            <td>1</td>
                            <td>${formatCurrency(invoice.total_invoice)}</td>
                            <td>${formatCurrency(invoice.total_invoice)}</td>
                        </tr>
                    `
                }
            </tbody>
        </table>

        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td>Subtotal</td>
                    <td>${formatCurrency(invoice.total_invoice)}</td>
                </tr>
                ${invoice.has_tax && invoice.tax ? `
                <tr>
                    <td>Pajak</td>
                    <td>${formatCurrency(invoice.tax)}</td>
                </tr>
                ` : ''}
                <tr class="grand-total">
                    <td>Total</td>
                    <td>${formatCurrency(invoice.grand_total)}</td>
                </tr>
            </table>
        </div>

        ${invoice.paid_at ? `
        <div class="payment-details">
            <h4>Informasi Pembayaran</h4>
            <p><strong>Dibayar pada:</strong> ${new Date(invoice.paid_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            ${invoice.payment_method ? `<p><strong>Metode Pembayaran:</strong> ${invoice.payment_method}</p>` : ''}
        </div>
        ` : ''}

        <div class="footer">
            <p>Terima kasih atas kepercayaan Anda menggunakan layanan kami.</p>
            <p>Jika ada pertanyaan, silakan hubungi customer service kami.</p>
        </div>
    </div>
</body>
</html>`;
}
