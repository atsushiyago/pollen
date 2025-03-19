const date = new Date();
let chartVal = []; // グラフデータ

const query = new URL(document.location).searchParams;
const code = query.get('code');
let days = query.get('days');

if (2 > days || 31 < days) {
  days = 2;
}

const optionStrs = [];
optionStrs.push(`<option value="1">-</option>`);
for (let i = 2; i < 32; i++) {
  if (i === Number(days)) {
    optionStrs.push(`<option value="${i}" selected>${i}</option>`);
  } else {
    optionStrs.push(`<option value="${i}">${i}</option>`);
  }
}
const optionHtml = `
  <select id="select_box">${optionStrs.join('')}</select>
`;
document.addEventListener(
  'DOMContentLoaded',
  function () {
    var elem = document.getElementById('select_box');
    elem.addEventListener(
      'change',
      function () {
        var result = elem.value;
        window.location.href =
          location.pathname + '?code=' + code + '&days=' + result;
      },
      false
    );
  },
  false
);

document.getElementById('header').innerHTML =
  '<b>' +
  array[array.indexOf(code) - 1] +
  'の花粉飛散数グラフ（任意の日数で1時間ごと）</b><br>表示する日数を2日から31日までの間で選んでください =>' +
  optionHtml +
  '日間で表示<br>グラフのデータポイントを押すと、日時と花粉飛散数が表示されます<br><a href="daily?code=' +
  code +
  '">日ごとのグラフ（観測開始日から）はこちらを押してください</a>';

document.getElementById('footer').innerHTML =
  '<br><a href="https://weathernews.jp/" target=”_blank” rel="noopener">株式会社ウェザーニュース</a>のポールンロボで観測された<a href="https://wxtech.weathernews.com/pollen/index.html" target=”_blank” rel="noopener">データ</a>を利用しています。スギとヒノキ（3・4月）、北海道でシラカバ（5月）をターゲットに観測しているとのことです（<a href="https://president.jp/articles/-/56090" target=”_blank” rel="noopener">紹介記事</a>）。毎時10分ほど後に更新されるようです。<p><a href="http://bicyclegeek.seesaa.net/article/464256573.html" target=”_blank” rel="noopener">はなこさん</a>による花粉観測は2021年で終了しています（<a href="https://www.env.go.jp/press/110339.html" target=”_blank” rel="noopener">環境省の報道発表資料</a>）<p><a href="index.html">トップページへ戻る</a>';

function getYYMMDD(day) {
  const dt = new Date();
  dt.setDate(dt.getDate() - day);
  const y = dt.getFullYear();
  const m = ('00' + (dt.getMonth() + 1)).slice(-2);
  const d = ('00' + dt.getDate()).slice(-2);
  const result = y + m + d;
  return result;
}

function getMMDDHH(hour) {
  const dt = new Date();
  dt.setHours(23 - hour);
  const y = dt.getFullYear();
  const m = ('00' + (dt.getMonth() + 1)).slice(-2);
  const d = ('00' + dt.getDate()).slice(-2);
  const h = ('00' + dt.getHours()).slice(-2);
  const result = m + '/' + d + ' ' + h + ':00';
  return result;
}

function convert_array(csv_data) {
  let data_array = [];
  const data_string = csv_data.split('\n');

  for (let i = 0; i < date.getHours() + (days - 1) * 24 + 2; i++) {
    if (i > 0) {
      data_array[i] = data_string[i].split(',');
      if (data_array[i][2] == '-9999') {
        data_array[i][2] = null;
      }
      chartVal.push(data_array[i][2]);
    }
  }
  // グラフ描画
  draw_chart();
}

let y_array = [];
for (let i = 0; i < days * 24; i++) {
  y_array.unshift(getMMDDHH(i));
}

function draw_chart() {
  const labels = y_array;

  const data = {
    labels: labels,
    datasets: [
      {
        label: '花粉飛散数（個数/m^2）',
        backgroundColor: 'rgb(255, 99, 132)',
        borderColor: 'rgb(255, 99, 132)',
        data: chartVal,
        borderWidth: 2,
        pointRadius: 2,
      },
    ],
  };

  const config = {
    type: 'line',
    data: data,
    options: {
      scales: {
        y: {
          display: true,
          suggestedMin: 0,
          suggestedMax: 20,
          beginAtZero: true,
        },
      },
    },
  };

  const myChart = new Chart(document.getElementById('myChart'), config);
}

fetch(
  'https://wxtech.weathernews.com/opendata/v1/pollen?citycode=' +
    code +
    '&start=' +
    getYYMMDD(days - 1) +
    '&end=' +
    getYYMMDD(0)
)
  .then((response) => {
    return response.text();
  })
  .then((csv_data) => {
    document.getElementById('loading').innerHTML = '';
    convert_array(csv_data);
  })
  .catch((error) => {
    console.log(error);
  });
