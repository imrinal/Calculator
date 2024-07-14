document.addEventListener('DOMContentLoaded', function() {
    const display = document.getElementById('display');
    const buttons = document.querySelectorAll('.buttons button');

    let currentInput = '';

    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const id = this.id;
            const value = this.textContent;

            if (id === 'clear') {
                currentInput = '';
                display.textContent = '0';
            } else if (id === 'delete') {
                currentInput = currentInput.slice(0, -1);
                display.textContent = currentInput || '0';
            } else if (id === 'equal') {
                try {
                    currentInput = eval(currentInput.replace(/x/g, '*').replace(/÷/g, '/')).toString();
                    display.textContent = currentInput;
                } catch (e) {
                    display.textContent = 'Error';
                }
            } else if (['plus', 'minus', 'multiply', 'divide', 'percent'].includes(id)) {
                currentInput += ` ${value} `;
                display.textContent = currentInput;
            } else {
                currentInput += value;
                display.textContent = currentInput;
            }
        });
    });
});
