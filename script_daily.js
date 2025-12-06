const query = new URL(document.location).searchParams;
const code = query.get('code');

document.getElementById('header').innerHTML =
  '<b>' +
  array[array.indexOf(code) - 1] +
  'の花粉飛散数グラフ（2025年の日ごと）</b><br><a href="hourly?code=' +
  code +
  '">1時間ごとのグラフはこちらを押してください</a>';

document.getElementById('footer').innerHTML =
  '<br><a href="https://weathernews.jp/" target=”_blank” rel="noopener">株式会社ウェザーニュース</a>のポールンロボで観測された<a href="https://wxtech.weathernews.com/pollen/index.html" target=”_blank” rel="noopener">データ</a>を利用しています。スギとヒノキ（3・4月）、北海道でシラカバ（5月）をターゲットに観測しているとのことです（<a href="https://president.jp/articles/-/56090" target=”_blank” rel="noopener">紹介記事</a>）。毎時10分ほど後に更新されるようです。<p>はなこさんによる花粉観測は2021年で終了しています（<a href="https://www.env.go.jp/press/110339.html" target=”_blank” rel="noopener">環境省の報道発表資料</a>）<p><a href="index.html">トップページへ戻る</a>';

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
        label: '花粉飛散数（個数/m^2）',
        backgroundColor: 'rgb(255, 99, 132)',
        borderColor: 'rgb(255, 99, 132)',
        data: chartVal,
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
        },
      },
    },
  };

  // Chart.defaults.font.size = 24;
  const myChart = new Chart(document.getElementById('myChart'), config);
}

let data_array = [],
  label_array = [],
  chartVal = [],
  total = 0,
  j = 0;

const urls = [];
function getPollenApiUrls(cityCode) {
  const today = new Date(); // 現在の日付を取得

  // 現在の月を含む、年初来のURL配列を生成
  for (let i = 0; i < today.getMonth() + 1; i++) {
    let endDate;
    let startDate;

    if (i === 0) { // 現在の月
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else { // 過去の月
      // 現在の月の1日 - iヶ月の日付を取得
      const tempDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      endDate = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0); // その月の最終日
      startDate = new Date(tempDate.getFullYear(), tempDate.getMonth(), 1); // その月の1日
    }

    // APIの最大取得期間（31日）を超えないように調整
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 31) {
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 30); // 31日分（今日から遡って30日前）
    }

    const startYear = startDate.getFullYear();
    const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
    const startDay = String(startDate.getDate()).padStart(2, '0');
    const startDateStr = `${startYear}${startMonth}${startDay}`;

    const endYear = endDate.getFullYear();
    const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
    const endDay = String(endDate.getDate()).padStart(2, '0');
    const endDateStr = `${endYear}${endMonth}${endDay}`;

    const url = `https://wxtech.weathernews.com/opendata/v1/pollen?citycode=${cityCode}&start=${startDateStr}&end=${endDateStr}`;

    urls.unshift(url);
  }
  get_data();
  //return urls;
}

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
        chartVal.push(total);
        label_array.unshift(getMMDD(j));
        j++;
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

getPollenApiUrls(code);
