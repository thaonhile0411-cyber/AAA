export function notifyStudyUpdate() {
  window.dispatchEvent(new Event("study-updated"));
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel("aaa-study-updates");
    channel.postMessage("updated");
    channel.close();
  }
}
