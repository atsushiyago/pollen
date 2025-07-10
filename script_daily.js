// HTML要素の取得
const query = new URL(document.location).searchParams;
const code = query.get('code');

// ヘッダーとフッターの設定
// arr.js で定義されている 'array' を使用
document.getElementById('header').innerHTML =
  '<b>' +
  array[array.indexOf(code) - 1] + // arrayを利用して都市名を取得
  'の花粉飛散数グラフ（2025年の日ごと）</b><br><a href="hourly?code=' +
  code +
  '">1時間ごとのグラフはこちらを押してください</a>';

document.getElementById('footer').innerHTML =
  '<br><a href="https://weathernews.jp/" target=”_blank” rel="noopener">株式会社ウェザーニュース</a>のポールンロボで観測された<a href="https://wxtech.weathernews.com/pollen/index.html" target=”_blank” rel="noopener">データ</a>を利用しています。スギとヒノキ（3・4月）、北海道でシラカバ（5月）をターゲットに観測しているとのことです（<a href="https://president.jp/articles/-/56090" target=”_blank” rel="noopener">紹介記事</a>）。毎時10分ほど後に更新されるようです。<p>はなこさんによる花粉観測は2021年で終了しています（<a href="https://www.env.go.jp/press/110339.html" target=”_blank” rel="noopener">環境省の報道発表資料</a>）<p><a href="index.html">トップページへ戻る</a>';

// 日付フォーマット関数（変更なし）
function getYYMMDD(day) {
  const dt = new Date();
  dt.setDate(dt.getDate() - day);
  const y = dt.getFullYear();
  const m = ('00' + (dt.getMonth() + 1)).slice(-2);
  const d = ('00' + dt.getDate()).slice(-2);
  const result = y + m + d;
  return result;
}

// 日付フォーマット関数（変更なし）
function getMMDD(date) { // 引数をDateオブジェクトに変更
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}/${d}`;
}

// グラフ描画関数（変更なし）
function draw_chart(labels, chartVal) {
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
          // APIデータに基づき動的に調整する方が良いかもしれません
          // suggestedMax: Math.max(...chartVal) * 1.2 || 20, // データの最大値に応じて調整
          beginAtZero: true,
        },
      },
      // レスポンシブにする場合は以下を追加
      responsive: true,
      maintainAspectRatio: false,
    },
  };

  const myChart = new Chart(document.getElementById('myChart'), config);
}

/**
 * 花粉データAPIのURLリストを生成する関数
 * @param {string} cityCode - 都市コード
 * @returns {string[]} 生成されたURLの配列
 */
function getPollenApiUrls(cityCode) {
  const urls = [];
  const today = new Date();

  // 現在の月を含む、年初来のURL配列を生成
  // 今年の1月1日から今日までの全ての月をカバー
  for (let i = today.getMonth(); i >= 0; i--) { // iを現在の月(0-11)から0まで減らす
    let endDate;
    let startDate;

    if (i === today.getMonth()) { // 現在の月
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else { // 過去の月（年内の）
      startDate = new Date(today.getFullYear(), i, 1);
      endDate = new Date(today.getFullYear(), i + 1, 0); // その月の最終日
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
    
    urls.push(url); // 古い順にするためにpush後にソート、または新しいループ順で調整
  }

  // ループ順を調整して古い順に生成されるように変更
  // 例: for (let i = 0; i <= today.getMonth(); i++) とし、startDate/endDateの計算を調整
  // または、生成後にreverse()する
  return urls.reverse(); // ここでurlsを逆順にして、古い日付から並ぶようにする
}

/**
 * CSVデータから日ごとの花粉合計値を抽出し、グラフ用のデータとラベルを生成する
 * @param {string} csv_data - APIから取得したCSV形式の文字列
 * @returns {object} { dailyData: [], labels: [] }
 */
function processCsvData(csv_data) {
  const dailyDataMap = new Map(); // 日付ごとの合計値を保持するためのMap
  const lines = csv_data.split('\n');

  for (let i = 1; i < lines.length; i++) { // ヘッダー行をスキップ
    const line = lines[i];
    if (!line) continue; // 空行をスキップ

    const parts = line.split(',');
    if (parts.length < 3) continue; // データが不完全な行をスキップ

    const dateStr = parts[0]; //YYYYMMDDHH形式
    const pollenValue = parseInt(parts[2], 10); // 花粉飛散数

    // 日付をYYYYMMDD形式に変換してマップのキーとする
    const dateKey = dateStr.substring(0, 8); //YYYYMMDD
    const dateObj = new Date(
      parseInt(dateKey.substring(0, 4)),
      parseInt(dateKey.substring(4, 6)) - 1, // 月は0から始まるため-1
      parseInt(dateKey.substring(6, 8))
    );

    // 花粉値が-9999の場合はnullとして扱い、合計に含めない
    const valueToAdd = pollenValue === -9999 ? null : pollenValue;

    if (dailyDataMap.has(dateKey)) {
      // 既存の合計値に加算
      const current = dailyDataMap.get(dateKey);
      dailyDataMap.set(dateKey, {
        total: current.total + (valueToAdd !== null ? valueToAdd : 0),
        count: current.count + (valueToAdd !== null ? 1 : 0),
        date: dateObj // Dateオブジェクトも保持
      });
    } else {
      // 新しい日付として追加
      dailyDataMap.set(dateKey, {
        total: (valueToAdd !== null ? valueToAdd : 0),
        count: (valueToAdd !== null ? 1 : 0),
        date: dateObj
      });
    }
  }

  // Mapからソートされた配列を生成
  const sortedDates = Array.from(dailyDataMap.keys()).sort();
  const chartVal = [];
  const labels = [];

  for (const dateKey of sortedDates) {
    const data = dailyDataMap.get(dateKey);
    // 日ごとの合計値をそのまま使用
    chartVal.push(data.total);
    labels.push(getMMDD(data.date));
  }

  return { chartVal, labels };
}


/**
 * 全てのAPIデータを取得し、グラフを描画するメイン関数
 */
async function initPollenChart() {
  document.getElementById('loading').innerHTML = 'データを読み込み中...'; // ローディング表示

  try {
    const urlsToFetch = getPollenApiUrls(code);

    // Promise.allSettled を使用して、一部のリクエストが失敗しても他の処理を続行できるようにする
    const results = await Promise.allSettled(
      urlsToFetch.map(url => fetch(url).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} from ${url}`);
        }
        return response.text();
      }))
    );

    let allChartVals = [];
    let allLabels = [];

    // 各レスポンスを処理
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const { chartVal, labels } = processCsvData(result.value);
        allChartVals = allChartVals.concat(chartVal);
        allLabels = allLabels.concat(labels);
      } else {
        console.error('Failed to fetch data:', result.reason);
      }
    });

    // 日付でソートし直す（重複除去も兼ねる）
    const combinedData = {};
    for (let i = 0; i < allLabels.length; i++) {
        const label = allLabels[i];
        const value = allChartVals[i];
        // 同じ日付のデータが複数ある場合は合計する (APIが期間重複しないので基本発生しないが念のため)
        combinedData[label] = (combinedData[label] || 0) + value;
    }

    const finalLabels = Object.keys(combinedData).sort((a, b) => {
        // M/D形式の日付を比較するための変換
        const [monthA, dayA] = a.split('/').map(Number);
        const [monthB, dayB] = b.split('/').map(Number);
        if (monthA !== monthB) return monthA - monthB;
        return dayA - dayB;
    });

    const finalChartVals = finalLabels.map(label => combinedData[label]);


    // 全てのデータが揃ってから一度だけグラフを描画
    draw_chart(finalLabels, finalChartVals);

  } catch (error) {
    console.error('グラフデータの取得または処理中にエラーが発生しました:', error);
    document.getElementById('loading').innerHTML = 'データの読み込みに失敗しました。';
  } finally {
    document.getElementById('loading').innerHTML = ''; // ローディング表示をクリア
  }
}

// ページロード時に実行
initPollenChart();