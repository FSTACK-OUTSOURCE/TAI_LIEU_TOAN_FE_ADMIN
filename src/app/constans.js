export const guidEmpty = "00000000-0000-0000-0000-000000000000";



export const FormatDateTime = (date) => {
    const formattedDate = date.toLocaleDateString('vi-VN'); // 'dd/MM/yyyy'
    const formattedTime = date.toLocaleTimeString('vi-VN', { hour12: false }); // 'HH:mm:ss' (24-hour format)
    return `${formattedDate} ${formattedTime}`;
}