const query = new URL(document.location).searchParams;
const code = query.get('code');

// ===== UI 初期化 =====
document.getElementById('header').innerHTML =
  `<b>${array[array.indexOf(code) - 1]}の花粉飛散数グラフ（2025年の日ごと）</b><br>
   <a href="hourly?code=${code}">1時間ごとのグラフはこちらを押してください</a>`;

document.getElementById('footer').innerHTML =
  `<br><a href="https://weathernews.jp/" target="_blank" rel="noopener">株式会社ウェザーニュース</a>のポールンロボで観測された
   <a href="https://wxtech.weathernews.com/pollen/index.html" target="_blank" rel="noopener">データ</a>を利用しています。
   <p>はなこさんによる花粉観測は2021年で終了しています（<a href="https://www.env.go.jp/press/110339.html" target="_blank" rel="noopener">環境省の報道発表資料</a>）
   <p><a href="index.html">トップページへ戻る</a>`;

// ===== Uniform API range (31 days chunks) =====
function buildApiUrls(cityCode) {
  const urls = [];
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  let cursor = new Date(today);

  while (cursor >= startOfYear) {
    const end = formatDate(cursor);

    const startCursor = new Date(cursor);
    startCursor.setDate(startCursor.getDate() - 30);

    if (startCursor < startOfYear) {
      startCursor.setTime(startOfYear.getTime());
    }

    const start = formatDate(startCursor);
    urls.push(`https://wxtech.weathernews.com/opendata/v1/pollen?citycode=${cityCode}&start=${start}&end=${end}`);

    cursor.setDate(cursor.getDate() - 31);
  }
  return urls;
}

// YYYYMMDD
function formatDate(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// MM/DD
function formatMMDD(dt) {
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${m}/${d}`;
}

// ===== main fetch + aggregate =====
async function loadPollenData() {
  const urls = buildApiUrls(code);

  // fetch 全取得（並列）
  const results = await Promise.all(urls.map(u => fetch(u).then(r => r.text())));

  // 全月分を連結して一括処理
  const bigCsv = results.join('\n');

  const lines = bigCsv.split('\n');
  const dailySum = {};
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 3) continue;

    const timestamp = cols[0];      // YYYYMMDDhhmm
    const value = Number(cols[2]);
    if (value < 0) continue;

    const dayKey = timestamp.slice(0, 8); // 日付ごとに集計
    if (!dailySum[dayKey]) dailySum[dayKey] = 0;
    dailySum[dayKey] += value;
  }

  // 日付順に並べ替え
  const days = Object.keys(dailySum).sort();

  // Chart.js 用データ生成
  const labels = [];
  const chartVal = [];
  
  for (const day of days) {
    const dt = new Date(
      Number(day.slice(0, 4)),
      Number(day.slice(4, 6)) - 1,
      Number(day.slice(6, 8))
    );
    labels.push(formatMMDD(dt));
    chartVal.push(dailySum[day]);
  }

  document.getElementById('loading').innerHTML = "";
  drawChart(labels, chartVal);
}

function drawChart(labels, chartVal) {
  const data = {
    labels: labels,
    datasets: [{
      label: '花粉飛散数（個数/m^2）',
      backgroundColor: 'rgb(255, 99, 132)',
      borderColor: 'rgb(255, 99, 132)',
      data: chartVal,
      pointRadius: 2,
      borderWidth: 2,
    }],
  };

  const config = {
    type: 'line',
    data,
    options: {
      scales: {
        y: { beginAtZero: true }
      },
    },
  };

  new Chart(document.getElementById('myChart'), config);
}

loadPollenData();
