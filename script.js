/* ==========================================================================
   AURA OMNIC ALC ENGINE
   Complete Corrected Calculator Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    'use strict';


    /* ================================================================
       APPLICATION STATE
    ================================================================ */

    const state = {

        currentInput: '0',

        expression: '',

        isAngleRad: false,

        memory: 0,

        history: [],

        currentMode: 'standard',

        matrixDim: 2

    };


    /* ================================================================
       DOM REFERENCES
    ================================================================ */

    const primaryDisplay =
        document.getElementById('primary-display');

    const expressionHistory =
        document.getElementById('expression-history');

    const angleUnit =
        document.getElementById('angle-unit');

    const memoryFlag =
        document.getElementById('memory-flag');

    const historyDrawer =
        document.getElementById('history-drawer');

    const historyList =
        document.getElementById('history-list');

    const historyToggle =
        document.getElementById('history-toggle');

    const historyClose =
        document.getElementById('history-close');

    const clearHistoryButton =
        document.getElementById('clear-history');

    const themeAngleButton =
        document.getElementById('theme-angle-btn');


    /* ================================================================
       HAPTIC FEEDBACK
    ================================================================ */

    function playHapticFeedback() {

        try {

            if (
                'vibrate' in navigator &&
                typeof navigator.vibrate === 'function'
            ) {
                navigator.vibrate(8);
            }

        } catch (error) {
            // Haptics are optional.
        }

    }


    /* ================================================================
       NUMBER FORMATTING
    ================================================================ */

    function formatNumber(value) {

        if (!Number.isFinite(value)) {
            return 'Error';
        }


        if (Object.is(value, -0)) {
            value = 0;
        }


        if (
            Math.abs(value) >= 1e12 ||
            (
                Math.abs(value) > 0 &&
                Math.abs(value) < 1e-10
            )
        ) {

            return value.toExponential(8)
                .replace(/\.?0+e/, 'e');

        }


        const rounded =
            Number(value.toPrecision(12));


        return String(rounded);

    }


    /* ================================================================
       FACTORIAL
    ================================================================ */

    function factorial(n) {

        if (!Number.isFinite(n)) {
            throw new Error('Invalid factorial');
        }


        if (n < 0 || !Number.isInteger(n)) {
            throw new Error(
                'Factorial requires a non-negative integer'
            );
        }


        if (n > 170) {
            throw new Error(
                'Number too large for factorial'
            );
        }


        let result = 1;


        for (let i = 2; i <= n; i++) {
            result *= i;
        }


        return result;

    }


    /* ================================================================
       DEG / RAD
    ================================================================ */

    function toRadians(value) {

        return state.isAngleRad
            ? value
            : value * Math.PI / 180;

    }


    /* ================================================================
       MATHEMATICAL EXPRESSION PREPROCESSOR
    ================================================================ */

    function normalizeExpression(expr) {

        let sanitized =
            String(expr)
                .replace(/\s+/g, '');



        /* --------------------------------
           Visual operators
        -------------------------------- */

        sanitized =
            sanitized.replace(/×/g, '*');

        sanitized =
            sanitized.replace(/÷/g, '/');



        /* --------------------------------
           Constants
        -------------------------------- */

        sanitized =
            sanitized.replace(/π/g, 'Math.PI');

        sanitized =
            sanitized.replace(
                /(^|[^A-Za-z0-9_])e(?![A-Za-z0-9_])/g,
                '$1Math.E'
            );



        /* --------------------------------
           Percentage
        -------------------------------- */

        sanitized =
            sanitized.replace(
                /(\d+(?:\.\d+)?)%/g,
                '($1/100)'
            );



        /* --------------------------------
           Square
        -------------------------------- */

        sanitized =
            sanitized.replace(
                /²/g,
                '**2'
            );



        /* --------------------------------
           Square root
        -------------------------------- */

        sanitized =
            sanitized.replace(
                /√\(/g,
                'Math.sqrt('
            );



        /* --------------------------------
           Functions
        -------------------------------- */

        sanitized =
            sanitized.replace(
                /\bsin\(/g,
                'Math.sin('
            );

        sanitized =
            sanitized.replace(
                /\bcos\(/g,
                'Math.cos('
            );

        sanitized =
            sanitized.replace(
                /\btan\(/g,
                'Math.tan('
            );

        sanitized =
            sanitized.replace(
                /\blog\(/g,
                'Math.log10('
            );

        sanitized =
            sanitized.replace(
                /\bln\(/g,
                'Math.log('
            );



        /* --------------------------------
           Trigonometry conversion
        -------------------------------- */

        if (!state.isAngleRad) {

            sanitized =
                sanitized.replace(
                    /Math\.sin\(([^()]*)\)/g,
                    'Math.sin(($1)*Math.PI/180)'
                );

            sanitized =
                sanitized.replace(
                    /Math\.cos\(([^()]*)\)/g,
                    'Math.cos(($1)*Math.PI/180)'
                );

            sanitized =
                sanitized.replace(
                    /Math\.tan\(([^()]*)\)/g,
                    'Math.tan(($1)*Math.PI/180)'
                );

        }



        /* --------------------------------
           Power operator
        -------------------------------- */

        sanitized =
            sanitized.replace(/\^/g, '**');



        /* --------------------------------
           Factorials
        -------------------------------- */

        sanitized =
            replaceFactorials(sanitized);



        return sanitized;

    }


    /* ================================================================
       FACTORIAL PARSER
    ================================================================ */

    function replaceFactorials(expression) {

        let result = expression;


        /*
         * Handles:
         *
         * 5!
         * (5)!
         * (2+3)!
         */

        const factorialRegex =
            /(\d+(?:\.\d+)?|\([^()]*\))!/g;


        let previous;


        do {

            previous = result;


            result =
                result.replace(
                    factorialRegex,
                    (match, value) => {

                        let numericValue;


                        if (
                            value.startsWith('(') &&
                            value.endsWith(')')
                        ) {

                            numericValue =
                                value.slice(1, -1);

                        } else {

                            numericValue = value;

                        }


                        return `factorial(${numericValue})`;

                    }
                );


        } while (result !== previous);


        return result;

    }


    /* ================================================================
       SAFE EXPRESSION EVALUATION
    ================================================================ */

    function evaluateExpression(expression) {

        try {

            if (
                !expression ||
                !String(expression).trim()
            ) {
                return '0';
            }


            const sanitized =
                normalizeExpression(expression);


            /*
             * The expression is generated by the calculator UI,
             * not arbitrary user JavaScript.
             */

            const resultFunction =
                new Function(
                    'factorial',
                    `"use strict"; return (${sanitized});`
                );


            const value =
                resultFunction(factorial);


            if (
                typeof value !== 'number' ||
                !Number.isFinite(value)
            ) {

                return 'Error';

            }


            return formatNumber(value);

        }

        catch (error) {

            console.error(
                'AURA calculation error:',
                error
            );

            return 'Error';

        }

    }


    /* ================================================================
       DISPLAY RENDERER
    ================================================================ */

    function renderDisplay() {

        primaryDisplay.textContent =
            state.currentInput || '0';


        expressionHistory.textContent =
            state.expression;


        memoryFlag.textContent =
            state.memory !== 0
                ? 'M'
                : '';


        angleUnit.textContent =
            state.isAngleRad
                ? 'RAD'
                : 'DEG';


        primaryDisplay.classList.toggle(
            'error',
            state.currentInput === 'Error'
        );


        const length =
            state.currentInput.length;


        if (length > 18) {

            primaryDisplay.style.fontSize =
                '1.35rem';

        }

        else if (length > 14) {

            primaryDisplay.style.fontSize =
                '1.6rem';

        }

        else if (length > 10) {

            primaryDisplay.style.fontSize =
                '2rem';

        }

        else if (length > 8) {

            primaryDisplay.style.fontSize =
                '2.3rem';

        }

        else {

            primaryDisplay.style.fontSize =
                '2.8rem';

        }

    }


    /* ================================================================
       INPUT HELPERS
    ================================================================ */

    function isOperator(value) {

        return [
            '+',
            '-',
            '×',
            '÷',
            '^',
            '%'
        ].includes(value);

    }


    function currentEndsWithOperator() {

        return /[+\-×÷^%]\s*$/
            .test(state.expression);

    }


    /* ================================================================
       NUMBER INPUT
    ================================================================ */

    function handleNumber(value) {

        playHapticFeedback();


        if (state.currentInput === 'Error') {

            state.currentInput = '0';
            state.expression = '';

        }


        if (value === '.') {

            /*
             * Prevent multiple decimal points.
             */

            if (
                state.currentInput.includes('.')
            ) {
                return;
            }


            /*
             * If starting a decimal number:
             */

            if (
                state.currentInput === '0' ||
                state.currentInput === ''
            ) {

                state.currentInput = '0.';

            }

            else {

                state.currentInput += '.';

            }


            renderDisplay();

            return;

        }


        if (
            state.currentInput === '0' &&
            value !== 'π' &&
            value !== 'e'
        ) {

            state.currentInput = value;

        }

        else {

            state.currentInput += value;

        }


        renderDisplay();

    }


    /* ================================================================
       OPERATOR HANDLER
    ================================================================ */

    function handleOperator(operator) {

        playHapticFeedback();


        if (
            state.currentInput === 'Error'
        ) {

            state.currentInput = '0';
            state.expression = '';

        }


        /*
         * Percentage acts on the current number.
         */

        if (operator === '%') {

            const value =
                parseFloat(state.currentInput);


            if (Number.isFinite(value)) {

                state.currentInput =
                    formatNumber(value / 100);

            }


            renderDisplay();

            return;

        }


        /*
         * If there is already an operator waiting,
         * replace it instead of generating:
         *
         * 5 + ×
         */

        if (
            currentEndsWithOperator()
        ) {

            state.expression =
                state.expression.replace(
                    /[+\-×÷^]\s*$/,
                    `${operator} `
                );

            renderDisplay();

            return;

        }


        /*
         * Move current number into expression.
         */

        state.expression +=
            `${state.currentInput} ${operator} `;


        state.currentInput = '0';


        renderDisplay();

    }


    /* ================================================================
       FUNCTION HANDLER
    ================================================================ */

    function handleFunction(value) {

        playHapticFeedback();


        if (
            state.currentInput === 'Error'
        ) {

            state.currentInput = '0';
            state.expression = '';

        }


        /* -------------------------
           Square
        ------------------------- */

        if (value === '²') {

            if (
                state.currentInput !== '0'
            ) {

                state.currentInput += '²';

            }

            renderDisplay();

            return;

        }


        /* -------------------------
           Factorial
        ------------------------- */

        if (value === '!') {

            if (
                state.currentInput !== '0'
            ) {

                state.currentInput += '!';

            }

            renderDisplay();

            return;

        }


        /* -------------------------
           Parentheses
        ------------------------- */

        if (
            value === '(' ||
            value === ')'
        ) {

            if (
                state.currentInput === '0'
            ) {

                state.currentInput = value;

            }

            else {

                state.currentInput += value;

            }


            renderDisplay();

            return;

        }


        /* -------------------------
           Scientific functions
        ------------------------- */

        if (
            value === 'sin(' ||
            value === 'cos(' ||
            value === 'tan(' ||
            value === 'log(' ||
            value === 'ln(' ||
            value === '√('
        ) {

            if (
                state.currentInput === '0'
            ) {

                state.currentInput = value;

            }

            else {

                /*
                 * If a number already exists,
                 * create function around it.
                 *
                 * Example:
                 *
                 * 9 → √(9)
                 */

                state.currentInput =
                    `${value}${state.currentInput})`;

            }


            renderDisplay();

            return;

        }


        /* -------------------------
           Power
        ------------------------- */

        if (value === '^') {

            state.expression +=
                `${state.currentInput} ^ `;

            state.currentInput = '0';

            renderDisplay();

            return;

        }

    }


    /* ================================================================
       CALCULATE
    ================================================================ */

    function calculate() {

        playHapticFeedback();


        if (
            state.currentInput === 'Error'
        ) {
            return;
        }


        /*
         * Complete expression:
         */

        let fullExpression =
            `${state.expression}${state.currentInput}`;


        /*
         * If there is a dangling operator,
         * remove it.
         */

        fullExpression =
            fullExpression.replace(
                /[+\-×÷^]\s*$/,
                ''
            );


        if (
            !fullExpression.trim()
        ) {

            return;

        }


        const result =
            evaluateExpression(
                fullExpression
            );


        if (
            result !== 'Error'
        ) {

            addHistory(
                fullExpression,
                result
            );

        }


        state.currentInput =
            result;

        state.expression =
            '';


        renderDisplay();

    }


    /* ================================================================
       CLEAR
    ================================================================ */

    function clearCalculator() {

        playHapticFeedback();

        state.currentInput = '0';

        state.expression = '';

        renderDisplay();

    }


    /* ================================================================
       DELETE
    ================================================================ */

    function deleteLast() {

        playHapticFeedback();


        if (
            state.currentInput === 'Error'
        ) {

            clearCalculator();

            return;

        }


        if (
            state.currentInput.length <= 1
        ) {

            state.currentInput = '0';

        }

        else {

            state.currentInput =
                state.currentInput.slice(0, -1);

        }


        renderDisplay();

    }


    /* ================================================================
       MEMORY
    ================================================================ */

    function memoryAdd() {

        const value =
            evaluateExpression(
                state.currentInput
            );


        if (value !== 'Error') {

            state.memory +=
                parseFloat(value) || 0;

        }


        renderDisplay();

    }


    function memoryClear() {

        state.memory = 0;

        renderDisplay();

    }


    function memoryRead() {

        state.currentInput =
            formatNumber(state.memory);

        renderDisplay();

    }


    /* ================================================================
       MAIN INPUT ROUTER
    ================================================================ */

    function handleInput(action, value) {

        switch (action) {

            case 'num':

                handleNumber(value);

                break;


            case 'operator':

                handleOperator(value);

                break;


            case 'func':

                handleFunction(value);

                break;


            case 'calculate':

                calculate();

                break;


            case 'clear':

                clearCalculator();

                break;


            case 'delete':

                deleteLast();

                break;


            case 'toggle-angle':

                toggleAngle();

                break;


            case 'mem-add':

                memoryAdd();

                break;


            case 'mem-clear':

                memoryClear();

                break;


            case 'mem-read':

                memoryRead();

                break;

        }

    }


    /* ================================================================
       ANGLE TOGGLE
    ================================================================ */

    function toggleAngle() {

        playHapticFeedback();


        state.isAngleRad =
            !state.isAngleRad;


        const button =
            document.getElementById(
                'deg-rad-btn'
            );


        /*
         * The button displays the mode that
         * will be switched to.
         */

        if (button) {

            button.textContent =
                state.isAngleRad
                    ? 'DEG'
                    : 'RAD';

        }


        renderDisplay();

    }


    /* ================================================================
       HISTORY
    ================================================================ */

    function addHistory(expression, result) {

        state.history.unshift({
            expr: expression,
            res: result
        });


        /*
         * Keep maximum 30 entries.
         */

        if (
            state.history.length > 30
        ) {

            state.history.pop();

        }


        renderHistory();

    }


    function renderHistory() {

        if (
            state.history.length === 0
        ) {

            historyList.innerHTML =
                `
                <div class="history-empty">
                    No calculations recorded yet
                </div>
                `;

            return;

        }


        historyList.innerHTML =
            state.history.map(
                (item, index) => {

                    return `
                        <div
                            class="history-item"
                            data-index="${index}"
                        >
                            <div class="hist-expr">
                                ${escapeHTML(item.expr)} =
                            </div>

                            <div class="hist-res">
                                ${escapeHTML(item.res)}
                            </div>
                        </div>
                    `;

                }
            ).join('');


        historyList
            .querySelectorAll('.history-item')
            .forEach(item => {

                item.addEventListener(
                    'click',
                    () => {

                        const index =
                            Number(
                                item.dataset.index
                            );


                        const historyItem =
                            state.history[index];


                        if (!historyItem) {
                            return;
                        }


                        state.currentInput =
                            historyItem.res;

                        state.expression =
                            '';


                        closeHistory();

                        renderDisplay();

                    }
                );

            });

    }


    function escapeHTML(value) {

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

    }


    function openHistory() {

        historyDrawer.classList.add('open');

        historyDrawer.setAttribute(
            'aria-hidden',
            'false'
        );

    }


    function closeHistory() {

        historyDrawer.classList.remove('open');

        historyDrawer.setAttribute(
            'aria-hidden',
            'true'
        );

    }


    /* ================================================================
       MODE SWITCHING
    ================================================================ */

    function switchMode(mode) {

        const modeButton =
            document.querySelector(
                `.mode-btn[data-mode="${mode}"]`
            );


        const panel =
            document.getElementById(
                `panel-${mode}`
            );


        if (
            !modeButton ||
            !panel
        ) {
            return;
        }


        document
            .querySelectorAll('.mode-btn')
            .forEach(button => {

                button.classList.remove(
                    'active'
                );

            });


        document
            .querySelectorAll('.panel-layout')
            .forEach(panelElement => {

                panelElement.classList.remove(
                    'active'
                );

            });


        modeButton.classList.add('active');

        panel.classList.add('active');


        state.currentMode =
            mode;

    }


    /* ================================================================
       MATRIX ENGINE
    ================================================================ */

    function renderMatrixGrid() {

        const dimension =
            state.matrixDim;


        ['matrix-a', 'matrix-b']
            .forEach(id => {

                const grid =
                    document.getElementById(id);


                if (!grid) {
                    return;
                }


                grid.className =
                    `matrix-grid dim-${dimension}`;


                grid.innerHTML = '';


                for (
                    let index = 0;
                    index < dimension * dimension;
                    index++
                ) {

                    const input =
                        document.createElement(
                            'input'
                        );


                    input.type = 'number';

                    input.className =
                        'matrix-cell';

                    input.value =
                        index % (dimension + 1) === 0
                            ? '1'
                            : '0';


                    grid.appendChild(input);

                }

            });

    }


    function getMatrixValues(id) {

        const cells =
            document.querySelectorAll(
                `#${id} .matrix-cell`
            );


        const dimension =
            state.matrixDim;


        const matrix = [];


        for (
            let row = 0;
            row < dimension;
            row++
        ) {

            const currentRow = [];


            for (
                let col = 0;
                col < dimension;
                col++
            ) {

                const cell =
                    cells[
                        row * dimension + col
                    ];


                const value =
                    parseFloat(cell?.value);


                currentRow.push(
                    Number.isFinite(value)
                        ? value
                        : 0
                );

            }


            matrix.push(
                currentRow
            );

        }


        return matrix;

    }


    /* ================================================================
       MATRIX ADDITION / SUBTRACTION
    ================================================================ */

    function addMatrices(A, B) {

        const n = A.length;


        return A.map(
            (row, i) =>
                row.map(
                    (_, j) =>
                        A[i][j] + B[i][j]
                )
        );

    }


    function subtractMatrices(A, B) {

        const n = A.length;


        return A.map(
            (row, i) =>
                row.map(
                    (_, j) =>
                        A[i][j] - B[i][j]
                )
        );

    }


    /* ================================================================
       MATRIX MULTIPLICATION
    ================================================================ */

    function multiplyMatrices(A, B) {

        const n = A.length;

        const result =
            Array.from(
                { length: n },
                () => Array(n).fill(0)
            );


        for (let i = 0; i < n; i++) {

            for (let j = 0; j < n; j++) {

                for (let k = 0; k < n; k++) {

                    result[i][j] +=
                        A[i][k] * B[k][j];

                }

            }

        }


        return result;

    }


    /* ================================================================
       MATRIX DETERMINANT
    ================================================================ */

    function matrixDeterminant(matrix) {

        const n = matrix.length;


        if (n === 1) {
            return matrix[0][0];
        }


        if (n === 2) {

            return (
                matrix[0][0] *
                matrix[1][1]
            ) - (
                matrix[0][1] *
                matrix[1][0]
            );

        }


        if (n === 3) {

            return (
                matrix[0][0] *
                (
                    matrix[1][1] *
                    matrix[2][2] -
                    matrix[1][2] *
                    matrix[2][1]
                )
            )
            -
            (
                matrix[0][1] *
                (
                    matrix[1][0] *
                    matrix[2][2] -
                    matrix[1][2] *
                    matrix[2][0]
                )
            )
            +
            (
                matrix[0][2] *
                (
                    matrix[1][0] *
                    matrix[2][1] -
                    matrix[1][1] *
                    matrix[2][0]
                )
            );

        }


        return 0;

    }


    /* ================================================================
       MATRIX TRANSPOSE
    ================================================================ */

    function transposeMatrix(matrix) {

        return matrix[0].map(
            (_, column) =>
                matrix.map(
                    row => row[column]
                )
        );

    }


    /* ================================================================
       MATRIX INVERSE
    ================================================================ */

    function inverseMatrix(matrix) {

        const n =
            matrix.length;


        /*
         * Create augmented matrix:
         *
         * [ A | I ]
         */

        const augmented =
            matrix.map(
                (row, i) => [

                    ...row,

                    ...Array.from(
                        { length: n },
                        (_, j) =>
                            i === j ? 1 : 0
                    )

                ]
            );


        for (
            let column = 0;
            column < n;
            column++
        ) {

            /*
             * Find pivot.
             */

            let pivotRow =
                column;


            for (
                let row = column + 1;
                row < n;
                row++
            ) {

                if (
                    Math.abs(
                        augmented[row][column]
                    ) >
                    Math.abs(
                        augmented[pivotRow][column]
                    )
                ) {

                    pivotRow = row;

                }

            }


            /*
             * Singular matrix.
             */

            if (
                Math.abs(
                    augmented[pivotRow][column]
                ) < 1e-12
            ) {

                return null;

            }


            /*
             * Swap rows.
             */

            if (
                pivotRow !== column
            ) {

                [
                    augmented[column],
                    augmented[pivotRow]
                ] = [
                    augmented[pivotRow],
                    augmented[column]
                ];

            }


            /*
             * Normalize pivot row.
             */

            const pivot =
                augmented[column][column];


            for (
                let j = 0;
                j < 2 * n;
                j++
            ) {

                augmented[column][j] /=
                    pivot;

            }


            /*
             * Eliminate other rows.
             */

            for (
                let row = 0;
                row < n;
                row++
            ) {

                if (row === column) {
                    continue;
                }


                const factor =
                    augmented[row][column];


                for (
                    let j = 0;
                    j < 2 * n;
                    j++
                ) {

                    augmented[row][j] -=
                        factor *
                        augmented[column][j];

                }

            }

        }


        return augmented.map(
            row =>
                row.slice(n)
        );

    }


    /* ================================================================
       MATRIX FORMAT
    ================================================================ */

    function formatMatrixOutput(matrix) {

        return `[ ${matrix
            .map(
                row =>
                    `[ ${row
                        .map(
                            value =>
                                formatNumber(value)
                        )
                        .join(', ')} ]`
            )
            .join(' ; ')} ]`;

    }


    /* ================================================================
       MATRIX OPERATION
    ================================================================ */

    function computeMatrixOperation(type) {

        const A =
            getMatrixValues('matrix-a');


        const B =
            getMatrixValues('matrix-b');


        const resultBox =
            document.getElementById(
                'matrix-result'
            );


        let result;


        if (type === 'add') {

            result =
                addMatrices(A, B);

        }

        else if (type === 'subtract') {

            result =
                subtractMatrices(A, B);

        }

        else if (type === 'multiply') {

            result =
                multiplyMatrices(A, B);

        }

        else {

            return;

        }


        resultBox.textContent =
            formatMatrixOutput(result);

    }


    /* ================================================================
       MATRIX SPECIAL OPERATION
    ================================================================ */

    function computeMatrixSpecial(type) {

        const A =
            getMatrixValues('matrix-a');


        const B =
            getMatrixValues('matrix-b');


        const resultBox =
            document.getElementById(
                'matrix-result'
            );


        switch (type) {

            case 'detA': {

                const determinant =
                    matrixDeterminant(A);


                resultBox.textContent =
                    `Det(A) = ${formatNumber(
                        determinant
                    )}`;

                break;

            }


            case 'detB': {

                const determinant =
                    matrixDeterminant(B);


                resultBox.textContent =
                    `Det(B) = ${formatNumber(
                        determinant
                    )}`;

                break;

            }


            case 'transA': {

                const result =
                    transposeMatrix(A);


                resultBox.textContent =
                    formatMatrixOutput(
                        result
                    );

                break;

            }


            case 'invA': {

                const result =
                    inverseMatrix(A);


                if (!result) {

                    resultBox.textContent =
                        'Inv(A) = Matrix is singular';

                }

                else {

                    resultBox.textContent =
                        formatMatrixOutput(
                            result
                        );

                }

                break;

            }

        }

    }


    /* ================================================================
       COMMERCIAL ENGINE
    ================================================================ */

    function setupCommercialEngine() {


        /* ------------------------------------------------------------
           COMPOUND INTEREST
        ------------------------------------------------------------ */

        const compoundButton =
            document.getElementById(
                'calc-ci-btn'
            );


        compoundButton?.addEventListener(
            'click',
            () => {

                const P =
                    parseFloat(
                        document.getElementById(
                            'ci-principal'
                        ).value
                    ) || 0;


                const rate =
                    parseFloat(
                        document.getElementById(
                            'ci-rate'
                        ).value
                    ) || 0;


                const years =
                    parseFloat(
                        document.getElementById(
                            'ci-years'
                        ).value
                    ) || 0;


                const r =
                    rate / 100;


                const amount =
                    P *
                    Math.pow(
                        1 + r,
                        years
                    );


                const interest =
                    amount - P;


                document.getElementById(
                    'comm-result-text'
                ).innerHTML = `

                    Total Maturity:
                    <strong>
                        ${formatCurrency(amount)}
                    </strong>

                    <br>

                    Total Interest Earned:
                    <strong>
                        ${formatCurrency(interest)}
                    </strong>

                `;

            }
        );


        /* ------------------------------------------------------------
           EMI
        ------------------------------------------------------------ */

        const emiButton =
            document.getElementById(
                'calc-emi-btn'
            );


        emiButton?.addEventListener(
            'click',
            () => {

                const principal =
                    parseFloat(
                        document.getElementById(
                            'emi-amount'
                        ).value
                    ) || 0;


                const annualRate =
                    parseFloat(
                        document.getElementById(
                            'emi-rate'
                        ).value
                    ) || 0;


                const months =
                    parseInt(
                        document.getElementById(
                            'emi-tenure'
                        ).value,
                        10
                    ) || 0;


                if (
                    principal <= 0 ||
                    months <= 0
                ) {

                    showCommercialError(
                        'Enter a valid loan amount and tenure.'
                    );

                    return;

                }


                /*
                 * Zero-interest loan.
                 */

                if (annualRate === 0) {

                    const emi =
                        principal / months;


                    const total =
                        emi * months;


                    document.getElementById(
                        'comm-result-text'
                    ).innerHTML = `

                        Monthly EMI:
                        <strong>
                            ${formatCurrency(emi)}
                        </strong>

                        <br>

                        Total Payable:
                        <strong>
                            ${formatCurrency(total)}
                        </strong>

                    `;

                    return;

                }


                const monthlyRate =
                    annualRate /
                    12 /
                    100;


                const power =
                    Math.pow(
                        1 + monthlyRate,
                        months
                    );


                const emi =
                    (
                        principal *
                        monthlyRate *
                        power
                    ) /
                    (power - 1);


                const totalPayment =
                    emi * months;


                const totalInterest =
                    totalPayment - principal;


                document.getElementById(
                    'comm-result-text'
                ).innerHTML = `

                    Monthly EMI:
                    <strong>
                        ${formatCurrency(emi)}
                    </strong>

                    <br>

                    Total Interest:
                    <strong>
                        ${formatCurrency(totalInterest)}
                    </strong>

                    <br>

                    Total Payable:
                    <strong>
                        ${formatCurrency(totalPayment)}
                    </strong>

                `;

            }
        );


        /* ------------------------------------------------------------
           GST ADD
        ------------------------------------------------------------ */

        const taxAddButton =
            document.getElementById(
                'calc-tax-add'
            );


        taxAddButton?.addEventListener(
            'click',
            () => {

                const amount =
                    parseFloat(
                        document.getElementById(
                            'tax-amount'
                        ).value
                    ) || 0;


                const rate =
                    parseFloat(
                        document.getElementById(
                            'tax-rate'
                        ).value
                    ) || 0;


                const tax =
                    amount *
                    rate /
                    100;


                const gross =
                    amount + tax;


                document.getElementById(
                    'comm-result-text'
                ).innerHTML = `

                    Base Amount:
                    <strong>
                        ${formatCurrency(amount)}
                    </strong>

                    <br>

                    Tax Component:
                    <strong>
                        ${formatCurrency(tax)}
                    </strong>

                    <br>

                    Gross Amount:
                    <strong>
                        ${formatCurrency(gross)}
                    </strong>

                `;

            }
        );


        /* ------------------------------------------------------------
           GST REMOVE
        ------------------------------------------------------------ */

        const taxRemoveButton =
            document.getElementById(
                'calc-tax-sub'
            );


        taxRemoveButton?.addEventListener(
            'click',
            () => {

                const gross =
                    parseFloat(
                        document.getElementById(
                            'tax-amount'
                        ).value
                    ) || 0;


                const rate =
                    parseFloat(
                        document.getElementById(
                            'tax-rate'
                        ).value
                    ) || 0;


                const base =
                    gross /
                    (1 + rate / 100);


                const tax =
                    gross - base;


                document.getElementById(
                    'comm-result-text'
                ).innerHTML = `

                    Pre-Tax Amount:
                    <strong>
                        ${formatCurrency(base)}
                    </strong>

                    <br>

                    Tax Component:
                    <strong>
                        ${formatCurrency(tax)}
                    </strong>

                    <br>

                    Gross Amount:
                    <strong>
                        ${formatCurrency(gross)}
                    </strong>

                `;

            }
        );


        /* ------------------------------------------------------------
           PROFIT / MARGIN
        ------------------------------------------------------------ */

        const marginButton =
            document.getElementById(
                'calc-margin-btn'
            );


        marginButton?.addEventListener(
            'click',
            () => {

                const cost =
                    parseFloat(
                        document.getElementById(
                            'margin-cost'
                        ).value
                    ) || 0;


                const selling =
                    parseFloat(
                        document.getElementById(
                            'margin-sell'
                        ).value
                    ) || 0;


                if (selling === 0) {

                    showCommercialError(
                        'Selling price cannot be zero.'
                    );

                    return;

                }


                const profit =
                    selling - cost;


                /*
                 * Profit margin:
                 *
                 * Profit / Selling Price × 100
                 */

                const margin =
                    profit /
                    selling *
                    100;


                /*
                 * Markup:
                 *
                 * Profit / Cost Price × 100
                 */

                const markup =
                    cost === 0
                        ? Infinity
                        : profit /
                          cost *
                          100;


                document.getElementById(
                    'comm-result-text'
                ).innerHTML = `

                    Net Profit:
                    <strong>
                        ${formatCurrency(profit)}
                    </strong>

                    <br>

                    Profit Margin:
                    <strong>
                        ${formatNumber(margin)}%
                    </strong>

                    <br>

                    Markup:
                    <strong>
                        ${
                            Number.isFinite(markup)
                                ? `${formatNumber(markup)}%`
                                : 'N/A'
                        }
                    </strong>

                `;

            }
        );

    }


    /* ================================================================
       CURRENCY FORMAT
    ================================================================ */

    function formatCurrency(value) {

        if (!Number.isFinite(value)) {
            return 'Error';
        }


        return `$${value.toLocaleString(
            'en-US',
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )}`;

    }


    /* ================================================================
       COMMERCIAL ERROR
    ================================================================ */

    function showCommercialError(message) {

        document.getElementById(
            'comm-result-text'
        ).innerHTML = `

            <strong>
                ${escapeHTML(message)}
            </strong>

        `;

    }


    /* ================================================================
       COMMERCIAL TABS
    ================================================================ */

    function setupCommercialTabs() {

        document
            .querySelectorAll('.comm-tab')
            .forEach(tab => {

                tab.addEventListener(
                    'click',
                    () => {

                        const target =
                            tab.dataset.comm;


                        document
                            .querySelectorAll(
                                '.comm-tab'
                            )
                            .forEach(
                                item =>
                                    item.classList
                                        .remove(
                                            'active'
                                        )
                            );


                        document
                            .querySelectorAll(
                                '.comm-form'
                            )
                            .forEach(
                                form =>
                                    form.classList
                                        .remove(
                                            'active'
                                        )
                            );


                        tab.classList.add(
                            'active'
                        );


                        const form =
                            document.getElementById(
                                `comm-${target}`
                            );


                        if (form) {

                            form.classList.add(
                                'active'
                            );

                        }

                    }
                );

            });

    }


    /* ================================================================
       BUTTON LISTENERS
    ================================================================ */

    document
        .querySelectorAll('.calc-btn')
        .forEach(button => {

            button.addEventListener(
                'click',
                () => {

                    const action =
                        button.dataset.action;


                    const value =
                        button.dataset.val;


                    handleInput(
                        action,
                        value
                    );

                }
            );

        });


    /* ================================================================
       MODE BUTTONS
    ================================================================ */

    document
        .querySelectorAll('.mode-btn')
        .forEach(button => {

            button.addEventListener(
                'click',
                () => {

                    switchMode(
                        button.dataset.mode
                    );

                }
            );

        });


    /* ================================================================
       MATRIX DIMENSION
    ================================================================ */

    document
        .querySelectorAll('.dim-btn')
        .forEach(button => {

            button.addEventListener(
                'click',
                () => {

                    document
                        .querySelectorAll(
                            '.dim-btn'
                        )
                        .forEach(
                            item =>
                                item.classList
                                    .remove(
                                        'active'
                                    )
                        );


                    button.classList.add(
                        'active'
                    );


                    state.matrixDim =
                        parseInt(
                            button.dataset.dim,
                            10
                        );


                    renderMatrixGrid();

                }
            );

        });


    /* ================================================================
       MATRIX OPERATIONS
    ================================================================ */

    document
        .querySelectorAll('.matrix-op-btn')
        .forEach(button => {

            button.addEventListener(
                'click',
                () => {

                    computeMatrixOperation(
                        button.dataset.mop
                    );

                }
            );

        });


    /* ================================================================
       MATRIX SPECIAL OPERATIONS
    ================================================================ */

    document
        .querySelectorAll('.matrix-spec-btn')
        .forEach(button => {

            button.addEventListener(
                'click',
                () => {

                    computeMatrixSpecial(
                        button.dataset.sop
                    );

                }
            );

        });


    /* ================================================================
       HISTORY CONTROLS
    ================================================================ */

    historyToggle?.addEventListener(
        'click',
        openHistory
    );


    historyClose?.addEventListener(
        'click',
        closeHistory
    );


    clearHistoryButton?.addEventListener(
        'click',
        () => {

            state.history = [];

            renderHistory();

        }
    );


    /* ================================================================
       THEME ANGLE BUTTON
    ================================================================ */

    themeAngleButton?.addEventListener(
        'click',
        () => {

            const chassis =
                document.querySelector(
                    '.calculator-chassis'
                );


            if (!chassis) {
                return;
            }


            chassis.style.transform =
                chassis.style.transform ===
                'rotateY(2deg)'
                    ? 'rotateY(-2deg)'
                    : 'rotateY(2deg)';

        }
    );


    /* ================================================================
       KEYBOARD SUPPORT
    ================================================================ */

    window.addEventListener(
        'keydown',
        event => {

            /*
             * Don't hijack keyboard input when
             * the user is typing into commercial
             * or matrix fields.
             */

            const target =
                event.target;


            if (
                target instanceof
                    HTMLInputElement ||
                target instanceof
                    HTMLTextAreaElement
            ) {

                return;

            }


            if (
                state.currentMode !== 'standard' &&
                state.currentMode !== 'scientific'
            ) {

                return;

            }


            const key =
                event.key;


            if (
                key >= '0' &&
                key <= '9'
            ) {

                event.preventDefault();

                handleInput(
                    'num',
                    key
                );

                return;

            }


            if (key === '.') {

                event.preventDefault();

                handleInput(
                    'num',
                    '.'
                );

                return;

            }


            if (key === '+') {

                event.preventDefault();

                handleInput(
                    'operator',
                    '+'
                );

                return;

            }


            if (key === '-') {

                event.preventDefault();

                handleInput(
                    'operator',
                    '-'
                );

                return;

            }


            if (key === '*') {

                event.preventDefault();

                handleInput(
                    'operator',
                    '×'
                );

                return;

            }


            if (key === '/') {

                event.preventDefault();

                handleInput(
                    'operator',
                    '÷'
                );

                return;

            }


            if (key === '%') {

                event.preventDefault();

                handleInput(
                    'operator',
                    '%'
                );

                return;

            }


            if (
                key === 'Enter' ||
                key === '='
            ) {

                event.preventDefault();

                handleInput(
                    'calculate'
                );

                return;

            }


            if (key === 'Backspace') {

                event.preventDefault();

                handleInput(
                    'delete'
                );

                return;

            }


            if (key === 'Escape') {

                event.preventDefault();

                handleInput(
                    'clear'
                );

            }

        }
    );


    /* ================================================================
       ENTER KEY IN COMMERCIAL FORMS
    ================================================================ */

    document
        .querySelectorAll(
            '.comm-form input'
        )
        .forEach(input => {

            input.addEventListener(
                'keydown',
                event => {

                    if (
                        event.key !== 'Enter'
                    ) {
                        return;
                    }


                    event.preventDefault();


                    const form =
                        input.closest(
                            '.comm-form'
                        );


                    const button =
                        form?.querySelector(
                            '.comm-calc-btn'
                        );


                    button?.click();

                }
            );

        });


    /* ================================================================
       INITIALIZATION
    ================================================================ */

    renderMatrixGrid();

    setupCommercialEngine();

    setupCommercialTabs();

    renderHistory();

    renderDisplay();


    console.log(
        'AURA Calculator Engine initialized successfully.'
    );

});