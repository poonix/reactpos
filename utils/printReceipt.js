// utils/printReceipt.js
import { BluetoothEscposPrinter } from 'react-native-bluetooth-escpos-printer';

export async function printReceipt(transaction, items) {
  try {
    await BluetoothEscposPrinter.printerInit();
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);

    await BluetoothEscposPrinter.printText("TOKO KASIR SAYA\n", { encoding: 'GBK', codepage: 0, widthtimes: 2, heigthtimes: 2, fonttype: 1 });
    await BluetoothEscposPrinter.printText("Jl. Raya No.123\n\n", {});

    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
    await BluetoothEscposPrinter.printText(`TRX: ${transaction.transaction_code}\n`, {});
    await BluetoothEscposPrinter.printText(`${formatDate(transaction.transaction_time)}\n`, {});
    await BluetoothEscposPrinter.printText(`Payment: ${transaction.payment_method}\n`, {});
    await BluetoothEscposPrinter.printText("--------------------------------\n", {});

    for (let item of items) {
      const line = `${item.quantity}x ${item.product_name}\nRp ${(item.price * item.quantity).toLocaleString()}\n`;
      await BluetoothEscposPrinter.printText(line, {});
    }

    await BluetoothEscposPrinter.printText("--------------------------------\n", {});
    await BluetoothEscposPrinter.printText(`TOTAL: Rp ${transaction.final_amount.toLocaleString()}\n`, { encoding: 'GBK', codepage: 0, widthtimes: 2, heigthtimes: 2 });
    await BluetoothEscposPrinter.printText("\nTerima kasih\n\n\n", {});

  } catch (err) {
    console.error('Print Error', err.message);
  }
}

function formatDate(dateStr) {
  const options = { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateStr).toLocaleDateString('id-ID', options);
}
