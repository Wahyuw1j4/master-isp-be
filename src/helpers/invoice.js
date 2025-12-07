import { prismaQuery, prisma, prismaTx } from "../prisma.js";

export async function generateInvoiceNumber() {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const datePrefix = `INV${year}${month}`;
    const lastInvoice = await prismaQuery(() =>
        prisma.invoice.findFirst({
            where: {
                invoice_no: {
                    startsWith: datePrefix
                }
            },
            orderBy: {
                invoice_no: 'desc'
            }
        })
    );

    let newSequence = '0001';
    if (lastInvoice) {
        const lastSequence = parseInt(lastInvoice.invoice_no.slice(-4));
        newSequence = String(lastSequence + 1).padStart(4, '0');
    }
    return `${datePrefix}${newSequence}`;
}

export async function calculateInvoiceTotals(invNo) {
    const invoice = await prisma.invoice.findUnique({
        where: { invoice_no: invNo },
        include: { invoice_details: true }
    });
    if (!invoice) throw new Error('Invoice tidak ditemukan.');

    const subTotal = invoice.invoice_details.reduce((s, d) => s + d.billing_price, 0);
    const taxAmount = invoice.has_tax ? subTotal * invoice.tax : 0;

    return prisma.invoice.update({
        where: { invoice_no: invNo },
        data: {
            total_invoice: subTotal,
            grand_total: subTotal + taxAmount,
            tax_amount: taxAmount
        }
    });
}


export async function createInvoice({ tx, afterCommit }, payload) {
    try {
        console.log('createInvoice payload:', payload);
        const {
            customerId,
            subscriptionId = null,
            hasTax = true,
            taxPercent = 0.11,
            description = null,
            invDtl,
        } = payload;

        if (!Array.isArray(invDtl) || invDtl.length === 0) {
            throw new Error('Invoice harus memiliki minimal 1 invoice_detail.');
        }

        const invoiceNo = await generateInvoiceNumber();
        const newInvoice = await tx.invoice.create({
            data: {
                invoice_no: invoiceNo,
                customer_id: customerId,
                subscription_id: subscriptionId,
                has_tax: hasTax,
                tax: taxPercent,
                description: description,
            }
        });
        for (const item of invDtl) {
            await tx.invoice_detail.create({
                data: {
                    invoice_no: invoiceNo,
                    billing_name: item.billingName,
                    billing_description: item.billingDescription,
                    billing_price: item.billingPrice,
                }
            });
        }
        afterCommit(async () => {
            await calculateInvoiceTotals(invoiceNo);
        });
        return newInvoice;
    } catch (error) {
        throw error;
    }
}

