/** کد QR برای اتصال اپ کدساز (فقط سرور) */
import QRCode from "qrcode";

export const qrSvg = (text: string) =>
  QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", width: 200 });
