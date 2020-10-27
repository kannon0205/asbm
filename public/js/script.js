const swiper1 = new Swiper('.swiper1', {
  speed: 400,
  spaceBetween: 10,
  pagination: {
    el: '.swiper-pagination',
    type: 'bullets',
    clickable: true,
    hideOnClick: true,
  },
});

const swiper2 = new Swiper('.swiper2', {
  speed: 400,
  spaceBetween: 10,
  pagination: {
    el: '.swiper-pagination',
    type: 'bullets',
    clickable: true,
    hideOnClick: true,
  },
});

(function () {
  const modalArea1 = document.getElementById('modalArea1');
  const openModal1 = document.getElementById('openModal1');
  const closeModal1 = document.getElementById('closeModal1');
  const modalBg1 = document.getElementById('modalBg1');
  const toggle1 = [openModal1, closeModal1, modalBg1];

  for (let i = 0, len = toggle1.length; i < len; i++) {
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

  for (let i = 0, len = toggle2.length; i < len; i++) {
    toggle2[i].addEventListener('click', function () {
      modalArea2.classList.toggle('is-show');
    }, false);
  }
}());
