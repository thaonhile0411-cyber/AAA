export function microphoneMessage(error: unknown) {
  const name =
    error && typeof error === "object" && "name" in error
      ? String(error.name)
      : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError")
    return "Microphone bị từ chối. Bấm biểu tượng bên trái thanh địa chỉ → Quyền trang web → Microphone → Cho phép, rồi tải lại trang. Chỉ dùng localhost hoặc HTTPS.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError")
    return "Không tìm thấy microphone. Kết nối thiết bị rồi thử lại.";
  if (name === "NotReadableError" || name === "TrackStartError")
    return "Microphone đang bận hoặc không đọc được. Đóng ứng dụng đang dùng mic rồi thử lại.";
  return "Chưa ghi âm được. Kiểm tra microphone, quyền truy cập và thử Chrome/Edge/Safari phiên bản mới.";
}
export function formatRecordingTime(seconds: number) {
  const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
export function recordingMime(supported: (mime: string) => boolean) {
  return (
    ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(supported) ?? ""
  );
}
