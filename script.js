const greetings = [
  'Hello, World!',
  '안녕하세요!',
  'Bonjour le Monde!',
  'Hola Mundo!',
  'こんにちは、世界！',
];

let index = 0;

document.getElementById('btn').addEventListener('click', () => {
  index = (index + 1) % greetings.length;
  document.getElementById('greeting').textContent = greetings[index];
});
