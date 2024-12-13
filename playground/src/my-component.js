import './my-component.pcss';

import circleImage from './assets/circle.svg';

const myComponentHTML = `
  <div class="container">
    <img src="${circleImage}" alt="" />
  </div>
`;

const targetDiv = document.querySelector('.some-block');

if (targetDiv) {
  targetDiv.innerHTML = myComponentHTML;
}
