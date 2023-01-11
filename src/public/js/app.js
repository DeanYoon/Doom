const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const micsSelect = document.getElementById("mics");
const speakersSelect = document.getElementById("speakers");
const text = document.getElementById("text");
const hangupBtn = document.getElementById("hangup");

const call = document.getElementById("call");
call.hidden = true;

let myStream;
let roomName;
let muted = false;
let cameraOff = false;
let myPeerConnection;
let myDataChannel;

async function getDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const mics = devices.filter((device) => device.kind === "audioinput");
    const speakers = devices.filter((device) => device.kind === "audiooutput");
    const currentMic = myStream.getAudioTracks()[0];
    const currentCamera = myStream.getVideoTracks()[0];

    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label === camera.label) {
        // select current using device at the option
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    });
    mics.forEach((mic) => {
      const option = document.createElement("option");
      option.value = mic.deviceId;
      option.innerText = mic.label;
      if (currentMic.label === mic.label) {
        // select current using device at the option
        option.selected = true;
      }
      micsSelect.appendChild(option);
    });
    speakers.forEach((speaker) => {
      addOptions(speaker, speakersSelect);
    });
  } catch (e) {
    console.log(e);
  }
}

function addOptions(device, devicesSelect) {
  const option = document.createElement("option");
  option.value = device.deviceId;
  option.innerText = device.label;
  devicesSelect.appendChild(option);
}

async function getMedia(deviceId) {
  const initialConstraints = {
    audio: muted,
    video: { facingMode: "user" },
  };
  const micConstraints = {
    audio: { deviceId: { exact: deviceId } },
    video: true,
  };
  const cameraConstraints = {
    audio: muted,
    video: { deviceId: { exact: deviceId } },
  };

  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstraints
    );
    myFace.srcObject = myStream;
    if (!deviceId) {
      await getDevices();
    }
  } catch (e) {
    console.log(e);
  }
}

function handleMuteClick() {
  myStream.getAudioTracks().forEach((track) => {
    track.enabled = !track.enabled;
  });

  if (!muted) {
    muteBtn.innerText = "Unmute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
}
function handleCameraClick() {
  myStream.getVideoTracks().forEach((track) => {
    track.enabled = !track.enabled;
  });
  if (!cameraOff) {
    cameraBtn.innerText = "Turn On Camera";
    cameraOff = true;
  } else {
    cameraBtn.innerText = "Turn Off Camera";
    cameraOff = false;
  }
}

async function handleCameraChange() {
  await getMedia(camerasSelect.value); //change the camera what is choosen
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    videoSender.replaceTrack(videoTrack);
    cameraOff = false;
    cameraBtn.innerText = "Turn Off Camera";
  }
}
async function handleMicChange() {
  await getMedia(micsSelect.value);
  if (myPeerConnection) {
    const audioTrack = myStream.getAudioTracks()[0];
    const audioSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "audio");
    audioSender.replaceTrack(audioTrack);
    if (muted) {
      muteBtn.innerText = "Unmute";
    } else {
      muteBtn.innerText = "Mute";
    }
  }
}
muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);
micsSelect.addEventListener("input", handleMicChange);

//Welcome Form (join a room)
const welcome = document.getElementById("welcome");
welcomeForm = welcome.querySelector("form");

async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  await initCall();
  socket.emit("join_room", input.value);
  roomName = input.value;
  input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Code
//peer A
socket.on("welcome", async () => {
  myDataChannel = myPeerConnection.createDataChannel("chat"); //create data channel
  myDataChannel.addEventListener("message", (event) =>
    sendText("Stranger", event.data)
  );
  console.log("made data channel");

  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  console.log("sent the offer");
  socket.emit("offer", offer, roomName);
}); //create offer

//peer B
socket.on("offer", async (offer) => {
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) =>
      sendText("Stranger", event.data)
    );
  });
  console.log("received the offer");

  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("sent the answer");
}); //recieves an offer

socket.on("answer", (answer) => {
  console.log("receive the answer");
  myPeerConnection.setRemoteDescription(answer);
});

//RTC Code

function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: ["stun:hk-turn1.xirsys.com"] },
      {
        username:
          "rcv2fI-kCdEPG39yv79J_Y_LpsfB236bZjd9N11EAOC-xcSs8vetK3cU5yefydV9AAAAAGO4Fi9kZWFu",
        credential: "f8ee55c8-8dbe-11ed-8827-0242ac120004",
        urls: [
          "turn:hk-turn1.xirsys.com:80?transport=udp",
          "turn:hk-turn1.xirsys.com:3478?transport=udp",
          "turn:hk-turn1.xirsys.com:80?transport=tcp",
          "turn:hk-turn1.xirsys.com:3478?transport=tcp",
          "turns:hk-turn1.xirsys.com:443?transport=tcp",
          "turns:hk-turn1.xirsys.com:5349?transport=tcp",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myPeerConnection.addEventListener("disconnected", handleDisconnected);
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

socket.on("ice", (ice) => {
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
});

function handleIce(data) {
  console.log("sent candidate");
  socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
  const peersStream = document.getElementById("peerFace");
  peersStream.srcObject = data.stream;
}
function handleDisconnected(event) {
  console.log(event);
}

//chatting
function handleTextSubmit(event) {
  event.preventDefault();
  const messageInput = document.getElementById("textInput");
  if (messageInput.value) {
    myDataChannel.send(messageInput.value);
    sendText("You", messageInput.value);
  }
  messageInput.value = "";
}
function sendText(owner, text) {
  const chatBox = document.getElementById("chat");
  const span = document.createElement("span");
  const spanText = document.createElement("span");
  const ol = document.createElement("ol");
  const ul = document.getElementById("chatBox");
  span.id = owner.toLowerCase();

  spanText.innerText = text;
  span.innerText = `${owner} : `;
  ol.appendChild(span);
  ol.appendChild(spanText);
  chatBox.appendChild(ol);
  ul.scrollTop = ul.scrollHeight;
}

function handleMessage(event) {
  console.log("message arrived");
}
text.addEventListener("submit", handleTextSubmit);
if (myDataChannel) {
  myDataChannel.addEventListener("message", handleMessage);
}

setInterval(() => {
  console.log(myPeerConnection.iceConnectionState);

  if (myPeerConnection.iceConnectionState === "disconnected") {
  }
}, 15000);

function hangup() {
  myPeerConnection.close();
  myPeerConnection = null;
}

hangupBtn.addEventListener("click", hangup);
