document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('electricity-cost-form');
  var applianceNameInput = document.getElementById('appliance-name');
  var resultArea = document.getElementById('electricity-cost-result');
  var resetButton = document.getElementById('reset-calculator');

  if (!form || !applianceNameInput || !resultArea || !resetButton) {
    return;
  }

  function getNumber(id) {
    var input = document.getElementById(id);

    if (!input) {
      return NaN;
    }

    var rawValue = input.value.trim();

    if (rawValue === '') {
      return NaN;
    }

    return Number(rawValue);
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) {
      return '0.00';
    }

    return value.toFixed(2);
  }

  function clearResult() {
    resultArea.replaceChildren();
  }

  function showMessage(message) {
    var paragraph = document.createElement('p');
    paragraph.textContent = message;

    clearResult();
    resultArea.appendChild(paragraph);
  }

  function addResultLine(label, value) {
    var paragraph = document.createElement('p');
    var strong = document.createElement('strong');

    strong.textContent = label + ': ';
    paragraph.appendChild(strong);
    paragraph.appendChild(document.createTextNode(value));

    resultArea.appendChild(paragraph);
  }

  function validateRequiredNumber(value, fieldName) {
    if (!Number.isFinite(value)) {
      return fieldName + ' is required.';
    }

    if (value < 0) {
      return fieldName + ' cannot be negative.';
    }

    if (value === 0) {
      return fieldName + ' must be greater than 0.';
    }

    return '';
  }

  function calculate() {
    var applianceName = applianceNameInput.value.trim() || 'Appliance';
    var watts = getNumber('appliance-watts');
    var hoursPerDay = getNumber('hours-per-day');
    var electricityRate = getNumber('electricity-rate');
    var daysPerMonth = getNumber('days-per-month');

    var wattsMessage = validateRequiredNumber(watts, 'Power in watts');
    if (wattsMessage) {
      showMessage(wattsMessage);
      return;
    }

    var hoursMessage = validateRequiredNumber(hoursPerDay, 'Hours used per day');
    if (hoursMessage) {
      showMessage(hoursMessage);
      return;
    }

    var rateMessage = validateRequiredNumber(electricityRate, 'Electricity rate per kWh');
    if (rateMessage) {
      showMessage(rateMessage);
      return;
    }

    var daysMessage = validateRequiredNumber(daysPerMonth, 'Days used per month');
    if (daysMessage) {
      showMessage(daysMessage);
      return;
    }

    if (hoursPerDay > 24) {
      showMessage('Hours used per day cannot be more than 24.');
      return;
    }

    if (daysPerMonth > 31) {
      showMessage('Days used per month cannot be more than 31.');
      return;
    }

    if (!Number.isInteger(daysPerMonth)) {
  showMessage('Days used per month must be a whole number.');
  return;
}
    var dailyKwh = (watts * hoursPerDay) / 1000;
    var monthlyKwh = dailyKwh * daysPerMonth;
    var dailyCost = dailyKwh * electricityRate;
    var monthlyCost = monthlyKwh * electricityRate;
    var yearlyCost = monthlyCost * 12;

    clearResult();

    addResultLine('Appliance', applianceName);
    addResultLine('Daily energy use', formatNumber(dailyKwh) + ' kWh');
    addResultLine('Monthly energy use', formatNumber(monthlyKwh) + ' kWh');
    addResultLine('Daily electricity cost', formatNumber(dailyCost));
    addResultLine('Monthly electricity cost', formatNumber(monthlyCost));
    addResultLine('Estimated yearly electricity cost', formatNumber(yearlyCost));

    var status = document.createElement('p');
    status.textContent = 'Estimate only. Real bills may include fixed charges, taxes, slab rates, meter fees, and rate changes.';
    resultArea.appendChild(status);
  }

  function resetCalculator() {
    form.reset();
    showMessage('Enter appliance details, then calculate to see estimated energy use and cost.');
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    calculate();
  });

  resetButton.addEventListener('click', resetCalculator);
});
