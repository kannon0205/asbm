(function () {
  const modalArea1 = document.getElementById('modalArea1');
  const openModal1 = document.getElementById('openModal1');
  const closeModal1 = document.getElementById('closeModal1');
  const modalBg1 = document.getElementById('modalBg1');
  const toggle1 = [openModal1, closeModal1, modalBg1];

  for (let i = 0, len1 = toggle1.length; i < len1; i++) {
    toggle1[i].addEventListener('click', function () {
      modalArea1.classList.toggle('is-show');
    }, false);
  }
}());

(function () {
  const modalArea2 = document.getElementById('modalArea2');
  const openModal2 = document.getElementById('openModal2');
  const closeModal2 = document.getElementById('closeModal2');
  const modalBg2 = document.getElementById('modalBg2');
  const toggle2 = [openModal2, closeModal2, modalBg2];

  for (let i = 0, len2 = toggle2.length; i < len2; i++) {
    toggle2[i].addEventListener('click', function () {
      modalArea2.classList.toggle('is-show');
    }, false);
  }
}());

(function () {
  const modalArea3 = document.getElementById('modalArea3');
  const openModal3 = document.getElementById('openModal3');
  const closeModal3 = document.getElementById('closeModal3');
  const modalBg3 = document.getElementById('modalBg3');
  const toggle3 = [openModal3, closeModal3, modalBg3];

  for (let i = 0, len3 = toggle3.length; i < len3; i++) {
    toggle3[i].addEventListener('click', function () {
      modalArea3.classList.toggle('is-show');
    }, false);
  }
}());