/* One device at a time: logging in on a new device logs the account out of the old one, unless an admin has
   switched on "Allow multiple devices" for that account (admins themselves are always allowed several).
   Each fresh login makes a random id, kept on the device and saved on the profile (active_session); every
   device re-checks it every minute and whenever its tab comes back into view, and logs itself out if the
   profile now holds a different id. Needs the active_session / allow_multi_device columns (supabase/devices.sql)
   — if they're missing, this quietly does nothing. Runs after app.js defines logout(). */

const deviceKey = () => `apex-device-${authUser.id}`;
const newDeviceId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
let deviceTimer = null;

// Called once the profile is loaded. Returns { ok: false } if this device has been replaced by a newer login.
async function claimDevice(profile, fresh) {
  const multi = !!profile.is_admin || !!profile.allow_multi_device;
  if (multi || profile.active_session === undefined) return { ok: true }; // allowed several, or feature not set up
  const local = store(deviceKey());
  if (fresh || !profile.active_session) {
    const id = newDeviceId();
    const { error } = await sb.from("profiles").update({ active_session: id }).eq("id", authUser.id);
    if (!error) store(deviceKey(), id);
    return { ok: true };
  }
  return { ok: !!local && local === profile.active_session };
}

async function checkDevice() {
  if (!authUser || !me || me.multiDevice) return;
  try {
    const { data, error } = await sb.from("profiles").select("active_session, allow_multi_device, is_admin").eq("id", authUser.id).single();
    if (error || !data) return;
    me.multiDevice = !!data.is_admin || !!data.allow_multi_device;
    if (me.multiDevice || !data.active_session) return;
    if (store(deviceKey()) !== data.active_session) {
      stopDeviceWatch();
      await logout();
      showDeviceKickedMessage();
    }
  } catch (e) { /* offline or a hiccup — try again next time */ }
}
function showDeviceKickedMessage() {
  const msg = $("#auth-msg");
  setMsg(msg, "You were logged out because this account was logged in on another device. Only one device can be logged in at a time — ask the site owner if you need more.", "error");
}
function startDeviceWatch() {
  stopDeviceWatch();
  deviceTimer = setInterval(checkDevice, 60000);
  document.addEventListener("visibilitychange", onDeviceVisible);
}
function stopDeviceWatch() {
  clearInterval(deviceTimer); deviceTimer = null;
  document.removeEventListener("visibilitychange", onDeviceVisible);
}
function onDeviceVisible() { if (document.visibilityState === "visible") checkDevice(); }
