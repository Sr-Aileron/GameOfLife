/* memo 修正・追加したい場所
ver 1.1
[+] テンプレートの見た目を整える 
[+] テンプレートのスクロール機能の追加
[+] テンプレートの回転機能
[+] generationの表示
[+] 実行速度調整機能
[+] 場外をどう扱うかの機能

ver 2.0
[-] cssを整える
*/

// 定数
const GRID_SIZE = 50;
const gridContainer = document.getElementById("grid-container");
const templatesContainer = document.getElementById("templates-container");

//ゲーム用変数
let grid = createEmptyGrid();
let cellPlaceGrid = createEmptyGrid(); //配置予定のセルだけを格納
let intervalId = null;
let selectedTemplate = null; //選択されているtemplateを格納する
let selectedTempData = {name: "", rowsize: 0, colsize: 0, shape: null};
let speed = 100;
let generation = 0;
let outOfGrid = false;

gridContainer.addEventListener('mouseleave', () => {
    cellPlaceGrid = createEmptyGrid()
    drawGrid();
});

/**
 * gridの情報を格納する配列を作る関数
 * @returns {number[][]}
 */
function createEmptyGrid() {
    return Array.from({length: GRID_SIZE}, () => 
        Array.from({length: GRID_SIZE}, () => 0)
    );
}

//gridを始める関数
function initializeGrid() {
    gridContainer.innerHTML = '';
    gridContainer.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;

    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            //クリックされた時に色を反転
            cell.addEventListener('click', invertCell);
            //カーソルが上にいる時に感知
            cell.addEventListener('mouseenter', (event) => {

                if (selectedTemplate === null || intervalId !== null) return;

                const y = parseInt(event.target.dataset.y, 10);
                const x = parseInt(event.target.dataset.x, 10);
                cellPlaceGrid = createEmptyGrid();
                
                const {rowsize, colsize, shape} = selectedTempData;
                for (let dy = 0; dy < rowsize; dy++) {
                    for (let dx = 0; dx < colsize; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;

                        if (ny >= GRID_SIZE || nx >= GRID_SIZE) continue;
                        if (shape[dy][dx] === 1) cellPlaceGrid[ny][nx] = 1;
                    }
                }

                drawGrid();
            })

            gridContainer.appendChild(cell);
        }
    }
}

//templateを始める関数
async function initializeTemplate() {
    templatesContainer.innerHTML = "";

    const response = await fetch('patterns.json');
    const PATTERNS = await response.json();

    for (const [key, value] of Object.entries(PATTERNS)) {
        const tmpElement = document.createElement('button');
        tmpElement.classList.add('template');
        tmpElement.dataset.name = key;
        tmpElement.dataset.rowsize = `${value.length}`;
        tmpElement.dataset.colsize = `${value[0].length}`;
        tmpElement.innerHTML = `${key.charAt(0).toUpperCase()}${key.slice(1).replace('_', '\n')}`;

        //クリックされた時の処理
        tmpElement.addEventListener('click', (event) => {
            //ターゲットがすでに選択されていた場合
            if (event.target.classList.contains('selected')) {
                event.target.classList.remove('selected');
                selectedTemplate = null;
                selectedTempData = null;
                rotateButton.disabled = 'disabled';
            } else {
                if (selectedTemplate !== null) selectedTemplate.classList.remove('selected');

                event.target.classList.add('selected');
                selectedTemplate = event.target;
                const ds = event.target.dataset;
                selectedTempData = {
                    name: ds.name,
                    rowsize: parseInt(ds.rowsize, 10),
                    colsize: parseInt(ds.colsize, 10),
                    shape: value
                };
                rotateButton.disabled = null;
            }
        });
        templatesContainer.appendChild(tmpElement);
    }
}

/**
 * 自分の周りの盤面を計算する関数
 * @param {int} y 
 * @param {int} x 
 * @return {int}
 */
function countAliveNeighbor(y, x) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;

            let cx = x + dx;
            let cy = y + dy;

            if (cx >= 0 && cx < GRID_SIZE && cy >= 0 && cy < GRID_SIZE) {
                count += grid[cy][cx];
            } else if (outOfGrid === false) {
                cy = cy === -1 ? 49 : cy === 50 ? 0 : cy;
                cx = cx === -1 ? 49 : cx === 50 ? 0 : cx;
                count += grid[cy][cx];
            }
        }
    }
    return count;
}

/**
 * 次の世代の盤面を計算する関数
 */
function computeNextGeneration() {
    let newGrid = createEmptyGrid();

    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const aliveNeighbor = countAliveNeighbor(y, x);
            
            //対象のセルが生きている時と死んでいるときで分ける
            if (grid[y][x] === 1) {
                if (aliveNeighbor === 2 || aliveNeighbor === 3) {
                    newGrid[y][x] = 1;
                } else {
                    newGrid[y][x] = 0;
                }
            } else {
                if (aliveNeighbor === 3) {
                    newGrid[y][x] = 1;
                }
            }
        }
    }
    grid = newGrid;
}

/**
 * 計算した盤面を画面に適用する関数
 */
function drawGrid() {
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const cellElement = gridContainer.children[y * GRID_SIZE + x];

            if (grid[y][x] === 1) {
                cellElement.classList.add('alive');
            } else {
                cellElement.classList.remove('alive');
            }

            if (selectedTemplate !== null) {
                if (cellPlaceGrid[y][x] === 1) {
                    cellElement.classList.add('placed');
                } else {
                    cellElement.classList.remove('placed');
                }
            }  
        }
    }
}

//テンプレートを画面に表示させる関数
function placeTemplate() {
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (cellPlaceGrid[y][x] === 1) {
                grid[y][x] = 1;
            }
        }
    }

    drawGrid();
}

//クリック時にセルを反転させる
function invertCell(event) {
    //停止時のみ反転する
    if (intervalId !== null) return;
    //テンプレートが選択中だった時の処理
    if (selectedTempData !== null) {
        placeTemplate();
        return;
    }

    const y = event.target.dataset.y;
    const x = event.target.dataset.x;

    grid[y][x] = grid[y][x] === 1 ? 0 : 1;
    drawGrid();
}

//mainloop
function mainLoop() {
    computeNextGeneration();
    drawGrid();
    generationCounter.innerHTML = `Generation: ${generation++}`;
}

//ボタンそれぞれが押された時の関数を定義
const generationCounter = document.getElementById('generation-counter');

const stateIcon = document.getElementById('status-icon');
const startButton = document.getElementById('start-button');
const stopButton = document.getElementById('stop-button');
const resetButton = document.getElementById('reset-button');
const rotateButton = document.getElementById('rotate-button');

const speedSelect = document.getElementById('speed');
const outOfGridCheck = document.getElementById('out-of-grid');

startButton.addEventListener('click', () => {
    if (intervalId === null) {
        intervalId = setInterval(mainLoop, speed);
        stateIcon.style.backgroundColor = ('lightgreen');
        resetButton.disabled = 'disabled';
        speedSelect.disabled = 'disabled';
    }
});

stopButton.addEventListener('click', () => {
    if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
        stateIcon.style.backgroundColor = ('red');
        resetButton.disabled = null;
        speedSelect.disabled = null;
    }
});

resetButton.addEventListener('click', () => {
    if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
        stateIcon.style.backgroundColor = ('red');
    }

    grid = createEmptyGrid();
    drawGrid();
    generation = 0;
    generationCounter.innerHTML = 'Generation: 0';
});

//回転処理
rotateButton.addEventListener('click', () => {
    const {rowsize, colsize, shape} = selectedTempData;
    let shapeRotated = Array.from({ length: colsize}, () => Array(rowsize).fill(0));

    for (let i = 0; i < colsize; i++) {
        for (let j = 0; j < rowsize; j++) {
            shapeRotated[i][j] = shape[j][i];
        }
    }

    selectedTempData.shape = shapeRotated.map(row => row.reverse());
})

speedSelect.addEventListener('change', () => {
    speed = parseInt(speedSelect.value, 10);
    console.log(`current speed: ${speed}`);
});

outOfGridCheck.addEventListener('change', () => {
    outOfGrid = outOfGrid === true ? false : true;
    console.log(outOfGrid);
})

async function main() {
    initializeGrid();
    await initializeTemplate();
    drawGrid();
}

main();