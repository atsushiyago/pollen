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

let label_array = [];
let chartVal = [];

// APIから取得したデータを日付ごとに集計する関数
function aggregateDailyPollen(allCsvText) {
    const dailyData = {};
    const lines = allCsvText.split('\n').filter(line => line.length > 0);

    // ヘッダー行をスキップし、データ行のみを処理
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        const dateTime = parts[0]; // YYYYMMDDhhmm
        const pollenCount = parseInt(parts[2], 10); // 花粉飛散数

        if (isNaN(pollenCount) || pollenCount === -9999) {
            continue; // 無効なデータはスキップ
        }

        // 日付部分 (YYYYMMDD) を抽出
        const date = dateTime.substring(0, 8);

        if (!dailyData[date]) {
            dailyData[date] = 0;
        }
        // 日ごとの合計値を加算
        dailyData[date] += pollenCount;
    }

    // 集計したデータからグラフ用の配列を作成
    label_array = [];
    chartVal = [];
    
    // YYYYMMDD の昇順でソートして処理
    Object.keys(dailyData).sort().forEach(date => {
        // YYYYMMDD -> MM/DD に変換
        const mmdd = `${date.substring(4, 6)}/${date.substring(6, 8)}`;
        label_array.push(mmdd);
        chartVal.push(dailyData[date]);
    });
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
                x: {
                    // X軸のラベルが多すぎるときに一部表示を省略
                    autoSkip: true,
                    maxTicksLimit: 20 // 表示する最大ラベル数
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `日付: ${context[0].label}`;
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toLocaleString() + '個/m^2';
                            }
                            return label;
                        }
                    }
                }
            }
        },
    };

    const myChart = new Chart(document.getElementById('myChart'), config);
}

function draw_data() {
    document.getElementById('loading').innerHTML = '';
    draw_chart();
}

/**
 * 1月1日から現在の日付までを最大31日間に分割し、APIのURLリストを生成する
 * @param {string} cityCode 都市コード
 * @returns {Array<string>} API URLの配列
 */
function getPollenApiUrls(cityCode) {
    const urls = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const janFirst = new Date(currentYear, 0, 1); // 1月1日

    let currentEnd = new Date(today); // API取得範囲の終了日 (初期値は今日)
    currentEnd.setHours(0, 0, 0, 0); // 時刻情報をクリア

    while (currentEnd >= janFirst) {
        let currentStart = new Date(currentEnd);
        // 31日間のデータを取得するために、終了日から30日遡る
        currentStart.setDate(currentEnd.getDate() - 30);
        
        // 1月1日より前の日付になる場合は、1月1日を開始日とする
        if (currentStart < janFirst) {
            currentStart = janFirst;
        }

        const startDateStr = formatDate(currentStart);
        const endDateStr = formatDate(currentEnd);

        const url = `https://wxtech.weathernews.com/opendata/v1/pollen?citycode=${cityCode}&start=${startDateStr}&end=${endDateStr}`;
        urls.push(url);

        // 次のループの終了日を、今回の開始日の前日とする
        currentEnd = new Date(currentStart);
        currentEnd.setDate(currentEnd.getDate() - 1);
        currentEnd.setHours(0, 0, 0, 0);
    }
    
    return urls;
}

// YYYYMMDD 形式で日付をフォーマット
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}

async function get_data() {
    const urls = getPollenApiUrls(code);

    try {
        // 全てのAPIリクエストを並行して実行
        const results = await Promise.all(
            urls.map(async (url) => {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`APIリクエストが失敗しました: ${response.statusText}`);
                }
                return response.text();
            })
        );
        
        // 取得したCSVデータを全て結合 (時系列順は保証されなくても aggregateDailyPollen で集計可能)
        const allCsvText = results.join('\n');
        
        // 日ごとの花粉飛散数を集計
        aggregateDailyPollen(allCsvText);
        
        // グラフ描画
        draw_data();

    } catch (error) {
        console.error("データ取得または処理中にエラーが発生しました:", error);
        document.getElementById('loading').innerHTML = 'データ取得に失敗しました。';
    }
}

// 処理の開始
get_data();