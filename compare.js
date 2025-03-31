const query = new URL(document.location).searchParams;
const code = query.get('code');
const code2 = query.get('code2');

// alert(
//   'データ更新のため1日の早朝まで日ごとのグラフの更新をお休みさせていただきます'
// );

document.getElementById('header').innerHTML =
  '<b>' +
  array[array.indexOf(code) - 1] +
  'と' +
  array[array.indexOf(code2) - 1] +
  'の花粉飛散数グラフ（2025年の日ごと）</b><br><a href="hourly?code=' +
  code +
  '">1時間ごとのグラフはこちらを押してください</a>';

document.getElementById('footer').innerHTML =
  '<br><a href="https://weathernews.jp/" target=”_blank” rel="noopener">株式会社ウェザーニュース</a>のポールンロボで観測された<a href="https://wxtech.weathernews.com/pollen/index.html" target=”_blank” rel="noopener">データ</a>を利用しています。ポールンロボはスギとヒノキ（3・4月）、北海道でシラカバ（5月）をターゲットに観測しているとのことです（<a href="https://president.jp/articles/-/56090" target=”_blank” rel="noopener">紹介記事</a>）。毎時10分ほど後に更新されるようです。<p>はなこさんによる花粉観測は2021年で終了しています（<a href="https://www.env.go.jp/press/110339.html" target=”_blank” rel="noopener">環境省の報道発表資料</a>）<p><a href="index.html">トップページへ戻る</a>';

function getYYMMDD(day) {
  const dt = new Date();
  dt.setDate(dt.getDate() - day);
  const y = dt.getFullYear();
  const m = ('00' + (dt.getMonth() + 1)).slice(-2);
  const d = ('00' + dt.getDate()).slice(-2);
  const result = y + m + d;
  return result;
}

function getMMDD(day) {
  // 観測期間外は終了日を記載（年表記に注意！
  // const dt = new Date('June 30, 2024');
  const dt = new Date();
  dt.setDate(dt.getDate() - day);
  const y = dt.getFullYear();
  const m = ('00' + (dt.getMonth() + 1)).slice(-2);
  const d = ('00' + dt.getDate()).slice(-2);
  const result = m + '/' + d;
  return result;
}

function draw_chart() {
  const labels = label_array;

  const data = {
    labels: labels,
    datasets: [
      {
        label: array[array.indexOf(code) - 1],
        backgroundColor: '#f88',
        borderColor: '#f88',
        data: chartVal,
        pointRadius: 2,
        borderWidth: 2,
      },
      {
        label: array[array.indexOf(code2) - 1],
        backgroundColor: '#48f',
        borderColor: '#48f',
        data: chartVal2,
        pointRadius: 2,
        borderWidth: 2,
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
          title: {
            display: true,
            text: '個数/m^2',
          },
        },
      },
    },
  };

  const myChart = new Chart(document.getElementById('myChart'), config);
}

let data_array = [],
  label_array = [],
  chartVal = [],
  chartVal2 = [],
  total = 0,
  j = 0;

const urls = [
  // 'data/24-2/' + code,
  // 'data/24-3/' + code,
  // 'data/24-4/' + code,
  // 'data/24-5/' + code,
  // 'data/24-6/' + code,
  // code
  'https://wxtech.weathernews.com/opendata/v1/pollen?citycode=' +
    code +
    '&start=20250120&end=20250131',
  'https://wxtech.weathernews.com/opendata/v1/pollen?citycode=' +
    code +
    '&start=20250201&end=20250228',
  'https://wxtech.weathernews.com/opendata/v1/pollen?citycode=' +
    code +
    '&start=20250301&end=20250331',
//     'https://wxtech.weathernews.com/opendata/v1/pollen?citycode=' +
//     code +
//     '&start=20240401&end=20240430',
//     'https://wxtech.weathernews.com/opendata/v1/pollen?citycode=' +
//     code +
//     '&start=20240501&end=20240531',
  'https://wxtech.weathernews.com/opendata/v1/pollen?citycode=' +
    code +
    '&start=20250401&end=' + getYYMMDD(0),
    // ,
    // 'data/24-2/' + code2,
    // 'data/24-3/' + code2,
    // 'data/24-4/' + code2,
    // 'data/24-5/' + code2,
    // 'data/24-6/' + code2,
  // code2
  'https://wxtech.weathernews.com/opendata/v1/pollen?citycode=' +
  code2 +
  '&start=20250120&end=20250131',
  'https://wxtech.weathernews.com/opendata/v1/pollen?citycode=' +
  code2 +
  '&start=20250201&end=20250228',
  'https://wxtech.weathernews.com/opendata/v1/pollen?citycode=' +
    code2 +
    '&start=20250301&end=20250331',
  //   'https://wxtech.weathernews.com/opendata/v1/pollen?citycode=' +
  //   code2 +
  //   '&start=20240401&end=20240430',
  //   'https://wxtech.weathernews.com/opendata/v1/pollen?citycode=' +
  //   code2 +
  //   '&start=20240501&end=20240531',
  'https://wxtech.weathernews.com/opendata/v1/pollen?citycode=' +
    code2 +
    '&start=20250401&end=' + getYYMMDD(0),
];

function convert_array(csv_data) {
  const data_string = csv_data.split('\n');
  for (let i = 0; i < data_string.length - 1; i++) {
    if (i > 0) {
      data_array[i] = data_string[i].split(',');
      if (data_array[i][2] == '-9999') {
        data_array[i][2] = null;
      }
      total += Number(data_array[i][2]);
      if (i % 24 == 0) {
        if (data_array[i][0] == code) {
          chartVal.push(total);
        } else {
          chartVal2.push(total);
          label_array.unshift(getMMDD(j));
          j++;
        }
        total = 0;
      }
    }
  }
}

function draw_data() {
  document.getElementById('loading').innerHTML = '';
  draw_chart();
}

async function get_data() {
  Promise.all(
    urls.map((target) => fetch(target).then((result) => result.text()))
  )
    .then((results) => results.forEach((text) => convert_array(text)))
    .then(() => draw_data());
}

get_data();
