const socket = io();

const welcome = document.querySelector("#welcome");
const room = document.querySelector("#room");
const form = welcome.querySelector("form");

room.hidden = true;

let roomName;

function addMessage(message) {
  const ul = room.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = message;
  ul.appendChild(li);
}
function roomTitle(roomName, countNum) {
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${countNum})`;
}
function showRoom(countNum) {
  welcome.hidden = true;
  room.hidden = false;
  roomTitle(roomName, countNum);
  const msgForm = room.querySelector("#msg");
  msgForm.addEventListener("submit", handleMessageSubmit);
}

function handleMessageSubmit(event) {
  event.preventDefault();
  const input = room.querySelector("#msg input");
  const value = input.value;
  socket.emit("new_message", input.value, roomName, () => {
    addMessage(`You: ${value}`);
    input.value = "";
  });
}

function handleRoomSubmit(event) {
  event.preventDefault();
  const inputRoom = document.querySelector("#inputRoom");
  const inputName = document.querySelector("#inputName");
  socket.emit("enter_room", inputRoom.value, inputName.value, showRoom);
  roomName = inputRoom.value;
}

form.addEventListener("submit", handleRoomSubmit);

socket.on("welcome", (user, newCount) => {
  roomTitle(roomName, newCount);
  addMessage(`${user} entered!`);
});

socket.on("bye", (left, newCount) => {
  roomTitle(roomName, newCount);

  addMessage(`${left} left`);
});

socket.on("new_message", addMessage);

socket.on("room_change", (rooms) => {
  const roomList = welcome.querySelector("ul");
  roomList.innerHTML = "";
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.innerText = `${room.room} (${room.roomUsers})`;
    roomList.append(li);
  });
});
