// HTML要素の取得
const query = new URL(document.location).searchParams;
const code = query.get('code');

// arr.js で定義されている 'array' を使用
// arr.jsが先に読み込まれていることを確認してください
document.getElementById('header').innerHTML =
  '<b>' +
  array[array.indexOf(code) - 1] +
  'の花粉飛散数グラフ（2025年の日ごと）</b><br><a href="hourly?code=' +
  code +
  '">1時間ごとのグラフはこちらを押してください</a>';

document.getElementById('footer').innerHTML =
  '<br><a href="https://weathernews.jp/" target=”_blank” rel="noopener">株式会社ウェザーニュース</a>のポールンロボで観測された<a href="https://wxtech.weathernews.com/pollen/index.html" target=”_blank” rel="noopener">データ</a>を利用しています。スギとヒノキ（3・4月）、北海道でシラカバ（5月）をターゲットに観測しているとのことです（<a href="https://president.jp/articles/-/56090" target=”_blank” rel="noopener">紹介記事</a>）。毎時10分ほど後に更新されるようです。<p>はなこさんによる花粉観測は2021年で終了しています（<a href="https://www.env.go.jp/press/110339.html" target=”_blank” rel="noopener">環境省の報道発表資料</a>）<p><a href="index.html">トップページへ戻る</a>';

// 日付フォーマット関数 (変更なし)
function getMMDD(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}/${d}`;
}

// グラフ描画関数 (変更なし)
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
          beginAtZero: true,
        },
      },
      responsive: true,
      maintainAspectRatio: false,
    },
  };

  // 既存のChartインスタンスがあれば破棄してから新規作成（メモリリーク対策）
  const existingChart = Chart.getChart('myChart');
  if (existingChart) {
    existingChart.destroy();
  }

  new Chart(document.getElementById('myChart'), config);
}

/**
 * 花粉データAPIのURLリストを生成する関数
 * ブラウザの負荷を考慮し、取得期間を調整します。
 * 例: 直近3ヶ月分のデータを取得
 * @param {string} cityCode - 都市コード
 * @param {number} monthsToFetch - 取得する月数 (例: 3で直近3ヶ月)
 * @returns {string[]} 生成されたURLの配列
 */
function getPollenApiUrls(cityCode, monthsToFetch = 3) { // デフォルトで3ヶ月
  const urls = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11

  // 取得期間を調整：直近の月からの指定された月数
  for (let i = 0; i < monthsToFetch; i++) {
    let targetDate = new Date(currentYear, currentMonth - i, 1);
    let startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    let endDate;

    if (i === 0) { // 現在の月
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    } else { // 過去の月
      endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0); // その月の最終日
    }

    // APIの最大取得期間（31日）は現在のロジックでは通常超えない
    // 念のため、安全策として残しておく
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 31) {
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 30);
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
    urls.push(url);
  }

  return urls.reverse(); // 古い順にソートして返す
}

/**
 * CSVデータから日ごとの花粉合計値を抽出し、グラフ用のデータとラベルを生成する
 * @param {string} csv_data - APIから取得したCSV形式の文字列
 * @returns {Map<string, {total: number, date: Date}>} 日付(YYYYMMDD)をキーとするMap
 */
function parseCsvDataToDailyMap(csv_data) {
  const dailyDataMap = new Map();
  const lines = csv_data.split('\n');

  for (let i = 1; i < lines.length; i++) { // ヘッダー行をスキップ
    const line = lines[i];
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length < 3) continue;

    const dateTimeStr = parts[0]; // YYYYMMDDHH形式
    const pollenValue = parseInt(parts[2], 10);

    const dateKey = dateTimeStr.substring(0, 8); // YYYYMMDD

    // -9999はデータなしとして扱い、合計に含めない
    if (pollenValue === -9999) {
      continue;
    }

    const existingData = dailyDataMap.get(dateKey);
    if (existingData) {
      dailyDataMap.set(dateKey, {
        total: existingData.total + pollenValue,
        date: existingData.date // Dateオブジェクトは一度取得すればOK
      });
    } else {
      // Dateオブジェクトを生成して保持
      const year = parseInt(dateKey.substring(0, 4));
      const month = parseInt(dateKey.substring(4, 6)) - 1; // 月は0から始まる
      const day = parseInt(dateKey.substring(6, 8));
      const dateObj = new Date(year, month, day);

      dailyDataMap.set(dateKey, {
        total: pollenValue,
        date: dateObj
      });
    }
  }
  return dailyDataMap;
}

/**
 * 全てのAPIデータを取得し、グラフを描画するメイン関数
 */
async function initPollenChart() {
  document.getElementById('loading').innerHTML = 'データを読み込み中...';

  try {
    // 取得する月数をここで調整 (例: 3ヶ月分)
    const urlsToFetch = getPollenApiUrls(code, 3); // ここで取得月数を変更可能

    const fetchPromises = urlsToFetch.map(url =>
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} from ${url}`);
          }
          return response.text();
        })
        .catch(error => {
          console.warn(`URL ${url} の取得に失敗しました:`, error);
          return null; // 失敗した場合はnullを返す
        })
    );

    const results = await Promise.all(fetchPromises); // Promise.allSettled から Promise.all に変更 (エラーをまとめて処理するため)

    // 全てのCSVデータを結合し、日ごとの集計を行うMapを生成
    const combinedDailyDataMap = new Map();

    results.forEach(csvText => {
      if (csvText) { // 取得に成功したCSVテキストのみ処理
        const currentMap = parseCsvDataToDailyMap(csvText);
        currentMap.forEach((value, key) => {
          // 複数のAPIレスポンスから同じ日付のデータが来る場合を考慮し、合計を更新
          const existing = combinedDailyDataMap.get(key);
          if (existing) {
            combinedDailyDataMap.set(key, {
              total: existing.total + value.total,
              date: value.date
            });
          } else {
            combinedDailyDataMap.set(key, value);
          }
        });
      }
    });

    // 集計したMapから最終的なグラフデータとラベルを生成し、日付でソート
    const finalLabels = [];
    const finalChartVals = [];

    // Mapのキー（日付文字列）をソートして、日付順にデータを取得
    const sortedDateKeys = Array.from(combinedDailyDataMap.keys()).sort();

    sortedDateKeys.forEach(dateKey => {
      const data = combinedDailyDataMap.get(dateKey);
      finalLabels.push(getMMDD(data.date));
      finalChartVals.push(data.total);
    });

    // データが全くない場合のエラーハンドリング
    if (finalLabels.length === 0) {
      document.getElementById('loading').innerHTML = '表示するデータがありませんでした。';
      return;
    }

    // 全てのデータが揃ってから一度だけグラフを描画
    draw_chart(finalLabels, finalChartVals);

  } catch (error) {
    console.error('グラフデータの取得または処理中に致命的なエラーが発生しました:', error);
    document.getElementById('loading').innerHTML = 'データの読み込み中にエラーが発生しました。';
  } finally {
    // 成功/失敗に関わらずローディング表示をクリア
    document.getElementById('loading').innerHTML = '';
  }
}

// ページロード時に実行
initPollenChart();