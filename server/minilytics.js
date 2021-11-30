const OVERVIEW_TABLE_MAX_ROWS = 10;

let root;
let siteId;
let data;

document.addEventListener('DOMContentLoaded', async function (e) {
	root = document.querySelector('.js-root');
	siteId = root.dataset.siteId;

	renderLoading();

	const today = new Date();
	const todayIsoString = today.toISOString().split('T')[0];

	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() -1);
	const yesterdayIsoString = yesterday.toISOString().split('T')[0];

	await loadData(yesterdayIsoString, yesterdayIsoString);

	render();

	loadLiveCountAndRefresh();
	setInterval(loadLiveCountAndRefresh, 15000);

	const filterDateFrom = document.querySelector('.js-filter-date-from');
	const filterDateTo = document.querySelector('.js-filter-date-to');

	filterDateFrom.max = todayIsoString;
	filterDateFrom.value = yesterdayIsoString;

	filterDateTo.max = todayIsoString;
	filterDateTo.value = yesterdayIsoString;

	filterDateFrom.addEventListener('change', function (e) {
		if (e.target.value > filterDateTo.value) {
			filterDateTo.value = this.value;
		}
	});

	filterDateTo.addEventListener('change', function (e) {
		if (e.target.value < filterDateFrom.value) {
			filterDateFrom.value = this.value;
		}
	});

	document.querySelector('.js-filter-form').hidden = false;
	document.querySelector('.js-filter-form').addEventListener('submit', async function (e) {
		e.preventDefault();

		renderLoading();
		await loadData(filterDateFrom.value, filterDateTo.value);
		setTimeout(() => {
			render();
			loadLiveCountAndRefresh();
		}, 300);
	});
});

async function loadData(dateFrom, dateTo) {
	const response = await fetch(`api.php?action=minilytics-data&site=${siteId}`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
		},
		body: JSON.stringify({
			dateFrom: dateFrom,
			dateTo: dateTo,
		}),
	});

	if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

	data = await response.json();

	return data;
}

async function loadLiveCountAndRefresh() {
	const response = await fetch(`api.php?action=minilytics-data&site=${siteId}`, {
		headers: {
			Accept: 'application/json',
		},
	});

	if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

	const data = await response.json();

	if (document.querySelector('.js-overview-live')) {
		document.querySelector('.js-overview-live').textContent = formatNumber(data.visits);
	}
}

function renderChart() {
	const chartData = [];
	const maximumMonth = 6;
	const maximumMonthDays = 30;
	const maximumLabelsX = 6;

	const chartWidth = 1000;
	const chartHeight = 600;
	const chartOffsetBottom = 50;
	const chartOffsetLeft = 60;
	const chartSpace = 20;
	const linesY = 8; // 8
	const tooltipSpace = 10;

	const chartWidthInside = chartWidth - chartOffsetLeft;
	const chartHeightInside = chartHeight - chartOffsetBottom;
	
	let stepsX = 0;
	let stepsY = chartHeightInside / linesY;
	let maxUnique = 0;
	let valuesY = 0;

	if (data.visitsPerDay.length == 1) {
		data.visitsPerDay[0].context.uniquePerHour.forEach(function (unique, hour) {
			if (unique > maxUnique) maxUnique = unique;

			chartData.push({
				'title': 'Hour',
				'label': hour,
				'unique': unique,
				'visits': data.visitsPerDay[0].context.uniquePerHour[hour],
			});
		});
	} else if (data.visitsPerDay.length > (maximumMonthDays * maximumMonth)) {
		currentMonth = new Date(data.visitsPerDay[0].name).getFullYear() + '-' + (new Date(data.visitsPerDay[0].name).getMonth() + 1);

		chartData.push({
			'title': 'Month',
			'label': currentMonth,
			'unique': data.visitsPerDay[0].unique,
			'visits': data.visitsPerDay[0].visits,
		});

		data.visitsPerDay.forEach(function (day, i) {
			if (currentMonth == new Date(day.name).getFullYear() + '-' + (new Date(day.name).getMonth() + 1)) {
				for (const record of chartData) {
					if (record.label == currentMonth) {
						record.unique += day.unique;
						record.visits += day.visits;

						break;
					}
				}
			} else {
				chartData.push({
					'title': 'Month',
					'label': new Date(day.name).getFullYear() + '-' + (new Date(day.name).getMonth() + 1),
					'unique': day.unique,
					'visits': day.visits,
				});

				currentMonth = new Date(day.name).getFullYear() + '-' + (new Date(day.name).getMonth() + 1);
			}
		});

		chartData.forEach(function (month) {
			if (month.unique > maxUnique) maxUnique = month.unique;
		});
	} else {
		data.visitsPerDay.forEach(function (day, i) {
			if (day.unique > maxUnique) maxUnique = day.unique;

			chartData.push({
				'title': 'Day',
				'label': day.name,
				'unique': day.unique,
				'visits': day.visits,
			});
		});
	}

	stepsX = chartWidthInside / (chartData.length - 1);
	valuesY = Math.round(maxUnique / linesY);
	if (valuesY == 0) valuesY = 1;

	document.querySelector('.js-chart-container').innerHTML = `
		<svg viewBox="0 0 ${chartWidth} ${chartHeight}" width="${chartWidth}px" height="${chartHeight}px" class="chart js-chart" aria-labelledby="chart-title" role="img">
			<title id="chart-title">Line Chart of visitors and views</title>

			<g class="chart__grid chart__grid--x">
				<line x1="${chartOffsetLeft - (chartSpace * 0.75)}" y1="${chartHeightInside}" x2="${chartWidth}" y2="${chartHeightInside}" />
			</g>
			<!-- <g class="chart__grid chart__grid--y">
				<line x1="${chartOffsetLeft}" y1="0" x2="${chartOffsetLeft}" y2="${chartHeightInside}" />
			</g> -->

			<g class="chart__lines chart__linex--x">
				${(() => {
					let lines = [];

					for (let i = 0; i <= linesY; i++) {
						const v = ((chartHeightInside) - (stepsY * i));
						lines.push(`<line x1="${chartOffsetLeft - (chartSpace * 0.75)}" y1="${v}" x2="${chartWidth}" y2="${v}" />`);
					}

					return lines.join('');
				})()}
			</g>

			<g class="chart__labels chart__labels--x">
				${(() => {
					let labels = [];
					let labelRatio = Math.round(chartData.length / maximumLabelsX);

					chartData.map((record, i) => {
						if (i == 0
							|| i == (chartData.length - 1)
							|| chartData.length <= maximumLabelsX
							|| i % labelRatio == 0
						) labels.push(`<text x="${(stepsX * i) + chartOffsetLeft}" y="${chartHeightInside + chartSpace}">${record.label}</text>`);
					});

					return labels.join('');
				})()}
				<!-- <text x="${(chartWidth / 2) + (chartOffsetLeft / 2)}" y="${chartHeightInside + (chartSpace * 2)}" class="label-title">Title</text> -->
			</g>
			<g class="chart__labels chart__labels--y">
				${(() => {
					let labels = [];

					for (let i = 0; i <= linesY; i++) {
						const v = ((chartHeightInside) - (stepsY * i));
						let label = valuesY * i;

						labels.push(`<text x="${chartOffsetLeft - (chartSpace * 0.75)}" y="${v}">${formatNumber(label)}</text>`);
					}

					return labels.join('');
				})()}
				<!-- <text x="${chartOffsetLeft / 2}" y="${(chartHeightInside / 2)}" class="chart__label-title">Title</text> -->
			</g>

			<linearGradient id="polyline-gradient" x1="0" x2="0" y1="0" y2="1">
				<stop offset="0%" stop-color="var(--color-stop-top)" />
				<stop offset="100%" stop-color="var(--color-stop-bottom)" />
			</linearGradient>

			<polyline class="chart__polyline" points="
				${chartData.map((record, i) => {
					let x = (stepsX * i) + chartOffsetLeft;
					let y = chartHeightInside - ((stepsY * record.unique) / valuesY);
					if (isNaN(y)) y = chartHeightInside;
					return `${x},${y}`;
				}).join(' ')}
			" fill="none" stroke="currentColor" stroke-width="2" stroke-line-cap="round" />

			<polyline class="chart__polyline chart__polyline--gradient" points="
				${chartOffsetLeft},${chartHeightInside}
				${chartData.map((record, i) => {
					let x = (stepsX * i) + chartOffsetLeft;
					let y = chartHeightInside - ((stepsY * record.unique) / valuesY);
					if (isNaN(y)) y = chartHeightInside;
					return `${x},${y}`;
				}).join(' ')}
				${chartWidth},${chartHeightInside}
			" fill="none" stroke="currentColor" stroke-width="2" stroke-line-cap="round" />

			<g class="chart__dots">
				${chartData.map((record, i) => {
					let x = (stepsX * i) + chartOffsetLeft;
					let y = chartHeightInside - ((stepsY * record.unique) / valuesY);
					if (isNaN(y)) y = chartHeightInside;
					return `
						<circle
							cx="${x}"
							cy="${y}"
							data-title="${record.title}"
							data-label="${record.label}"
							data-visitors="${record.unique}"
							data-views="${record.visits}"
							r="3"
						/>
						<circle
							cx="${x}"
							cy="${y}"
							data-title="${record.title}"
							data-label="${record.label}"
							data-visitors="${record.unique}"
							data-views="${record.visits}"
							r="12"
							class="chart-dot-handle js-chart-dot-handle"
						/>
					`;
				}).join('')}
			</g>
		</svg>
		<div class="chart-tooltip js-chart-tooltip" aria-hidden="true" hidden></div>
	`;

	const chart = document.querySelector('.js-chart');
	const chartDotTooltip = document.querySelector('.js-chart-tooltip');
	const chartDots = document.querySelectorAll('.js-chart-dot-handle');
	chartDots.forEach(function (dot) {
		dot.addEventListener('mouseover', function () {
			chartDotTooltip.innerHTML = `
				${this.dataset.title}: ${this.dataset.label}<br />
				Visitors: ${this.dataset.visitors}<br />
				Views: ${this.dataset.views}
			`;

			const chartWidthSvg = parseFloat(chart.getAttribute('width').replace('px'));
			const chartHeightSvg = parseFloat(chart.getAttribute('height').replace('px'));
			const chartWidthOnScreen = chart.getBoundingClientRect().width;
			const chartHeightOnScreen = chart.getBoundingClientRect().height;

			const factorX = (parseFloat(this.getAttribute('cx')) * 100) / chartWidthSvg;
			const factorY = (parseFloat(this.getAttribute('cy')) * 100) / chartHeightSvg;
			
			const x = (chartWidthOnScreen * factorX) / 100;
			const y = (chartHeightOnScreen * factorY) / 100;

			chartDotTooltip.hidden = false;

			const chartDotTooltipRect = chartDotTooltip.getBoundingClientRect();

			chartDotTooltip.style.top = (y - (chartDotTooltipRect.height + tooltipSpace)) + 'px';
			chartDotTooltip.style.left = (x - (chartDotTooltipRect.width / 2)) + 'px';
		});
		dot.addEventListener('mouseout', function () {
			chartDotTooltip.hidden = true;
		});
	});
}

function renderTable(result, mapping, caption, rows) {
	sortDesc(result, 'visits');

	const renderTableHeadCells = function (mapping) {
		let heads = '';
		for (const prop in mapping) {
			heads += `<th>${typeof mapping[prop] === 'function' ? mapping[prop]() : mapping[prop]}</th>`;
		}
		return heads;
	};

	const renderTableBodyCells = function (item, mapping) {
		let cells = '';

		for (const prop in mapping) {
			cellContent = typeof mapping[prop] === 'function' ? mapping[prop](item) : item[prop];
			cells += `
				<td>
					${rows ? `<span class="text-truncate">` : ''}
					${cellContent}
					${rows ? `</span>` : ''}
				</td>
			`;
		}

		return cells;
	}

	let rowCount = 0;

	return `
		<table>
			${caption ? `<caption>${caption}}</caption>` : ''}
			<thead>
				<tr>
					${renderTableHeadCells(mapping)}
				</tr>
			</thead>
			<tbody>
				${result.map(resultItem => {
					if (rows && rows == rowCount) return;

					rowCount++;
				return `
				<tr>
					${renderTableBodyCells(resultItem, mapping)}
				</tr>
				`;
				}).join('')}
				${rowCount == 0 ? `<td colspan="2">No data available.</td>` : ''}
			</tbody>
		</table>
	`;
}

function renderDetailsButton(result, dialogModalSelector) {
	if (result.length <= OVERVIEW_TABLE_MAX_ROWS) return '';

	return `<button class="details-button" data-dm="${dialogModalSelector}">Details</button>`;
}

function renderDetailsDialogModal(className, contenetAsHtml) {
	return `
		<template class="${className}">
			${contenetAsHtml}
		</template>
	`;
}

function renderPages() {
	return `
		<h2>Pages</h2>

		${renderTable(data.pages, {
			name: 'Page',
			visits: 'Views',
			unique: 'Visitors',
		}, null, OVERVIEW_TABLE_MAX_ROWS)}

		${renderDetailsButton(data.pages, '.js-dm-pages')}
		${renderDetailsDialogModal('js-dm-pages',
			`<h1>Pages</h1>` +
			renderTable(data.pages, {
				name: 'Page',
				visits: 'Views',
				unique: 'Visitors',
				duration: function (item) {
					if (!item) return 'Duration';

					let total = 0;
					for (const duration of item.context) {
						total += duration / 1000;
					}

					if (total == 0) return `-`;
					return formatToMinutesAndSeconds(total / item.context.length);
				},
			})
		)}
	`;
}

function renderSources() {
	return `
		<h2>Sources</h2>

		<bhdzllr-tabs wa-aria-label="Sources">
			<button slot="tab">Referrer</button>
			<button slot="tab">Source</button>
			<button slot="tab">Medium</button>
			<button slot="tab">Campaign</button>

			<section slot="tabpanel">
				<h3 class="screen-reader-text">Referrer</h3>

				${renderTable(data.referrers, {
					name: 'Referrer',
					unique: 'Visitors',
				}, null, OVERVIEW_TABLE_MAX_ROWS)}

				${renderDetailsButton(data.referrers, '.js-dm-sources-referrer')}
				${renderDetailsDialogModal('js-dm-sources-referrer',
					`<h1>Referrers</h1>` +
					renderTable(data.referrers, {
						name: 'Referrer',
						visits: 'Views',
						unique: 'Visitors',
					})
				)}
			</section>

			<section slot="tabpanel">
				<h3 class="screen-reader-text">Source</h3>

				${renderTable(data.utmSources, {
					name: 'UTM Source',
					unique: 'Visitors',
				}, null, OVERVIEW_TABLE_MAX_ROWS) }

				${renderDetailsButton(data.utmSources, '.js-dm-sources-source') }
				${renderDetailsDialogModal('js-dm-sources-source',
					`<h1>UTM Sources</h1>` +
					renderTable(data.utmSources, {
						name: 'UTM Source',
						visits: 'Views',
						unique: 'Visitors',
					})
				)}
			</section>

			<section slot="tabpanel">
				<h3 class="screen-reader-text">Medium</h3>

				${renderTable(data.utmMediums, {
					name: 'UTM Medium',
					unique: 'Visitors',
				}, null, OVERVIEW_TABLE_MAX_ROWS)}

				${renderDetailsButton(data.utmMediums, '.js-dm-sources-medium')}
				${renderDetailsDialogModal('js-dm-sources-medium',
					`<h1>UTM Mediums</h1>` +
					renderTable(data.utmMediums, {
						name: 'UTM Medium',
						visits: 'Views',
						unique: 'Visitors',
					})
				)}
			</section>

			<section slot="tabpanel">
				<h3 class="screen-reader-text">Campaign</h3>

				${renderTable(data.utmCampaigns, {
					name: 'UTM Campaign',
					unique: 'Visitors',
				}, null, OVERVIEW_TABLE_MAX_ROWS) }

				${renderDetailsButton(data.utmCampaigns, '.js-dm-sources-campaign')}
				${renderDetailsDialogModal('js-dm-sources-campaign',
					`<h1>UTM Campaigns</h1>` +
					renderTable(data.utmCampaigns, {
						name: 'UTM Campaign',
						visits: 'Views',
						unique: 'Visitors',
					})
				)}
			</section>
		</bhdzllr-tabs>
	`;
}

function renderCountries() {
	return `
		<h2>Countries</h2>

		${renderTable(data.countries, {
			name: 'Country',
			unique: 'Visitors',
		}, null, OVERVIEW_TABLE_MAX_ROWS)}

		${renderDetailsButton(data.countries, '.js-dm-countries')}
		${renderDetailsDialogModal('js-dm-countries',
			`<h1>Countries</h1>` +
			renderTable(data.countries, {
				name: 'Country',
				visits: function (item) {
					if (!item) return 'Views';
					return `${item.visits} ${formatToPercentageString((item.visits * 100) / data.visits.visits)}`;
				},
				unique: function (item) {
					if (!item) return 'Visitors';
					return `${item.unique} ${formatToPercentageString((item.unique * 100) / data.visits.unique)}`;
				},
			})
		)}
	`;
}

function renderDevices() {
	return `
		<h2>Devices</h2>

		<bhdzllr-tabs wa-aria-label="Devices">
			<button slot="tab">Size</button>
			<button slot="tab">Name</button>
			<button slot="tab">Version</button>

			<section slot="tabpanel">
				<h3 class="screen-reader-text">Size</h3>

				${renderTable(data.devices, {
					name: function (item) {
						if (!item) return 'Screen size';
						return `<span title="${item.context}">${item.name}</span>`;
					},
					unique: 'Visitors',
				}, null, OVERVIEW_TABLE_MAX_ROWS)}

				<p class="devices-touch">Visitors with Touch Support: ${data.touch.unique} (${Math.round((data.touch.unique * 100) / data.visits.unique)}&nbsp;%)</p>

				${renderDetailsButton(data.devices, '.js-dm-devices')}
				${renderDetailsDialogModal('js-dm-devices',
					`<h1>Devices</h1>` +
					renderTable(data.devices, {
						name: function (item) {
							if (!item) return 'Screen size';
							return `<span title="${item.context}">${item.name}</span>`;
						},
						visits: function (item) {
							if (!item) return 'Views';
							return `${item.visits} ${formatToPercentageString((item.visits * 100) / data.visits.visits)}`;
						},
						unique: function (item) {
							if (!item) return 'Visitors';
							return `${item.unique} ${formatToPercentageString((item.unique * 100) / data.visits.unique)}`;
						},
					})
				)}
			</section>

			<section slot="tabpanel">
				<h3 class="screen-reader-text">Name</h3>

				${renderTable(data.browserNames, {
					name: 'Browser',
					unique: 'Visitors',
				}, null, OVERVIEW_TABLE_MAX_ROWS)}

				${renderDetailsButton(data.browserNames, '.js-dm-browser-names')}
				${renderDetailsDialogModal('js-dm-browser-names',
					`<h1>Browser Names</h1>` +
					renderTable(data.browserNames, {
						name: 'Browser',
						visits: function (item) {
							if (!item) return 'Views';
							return `${item.visits} ${formatToPercentageString((item.visits * 100) / data.visits.visits)}`;
						},
						unique: function (item) {
							if (!item) return 'Visitors';
							return `${item.unique} ${formatToPercentageString((item.unique * 100) / data.visits.unique)}`;
						},
					})
				)}
			</section>

			<section slot="tabpanel">
				<h3 class="screen-reader-text">Version</h3>

				${renderTable(data.browserVersions, {
					name: 'Browser',
					unique: 'Visitors',
				}, null, OVERVIEW_TABLE_MAX_ROWS) }

				${renderDetailsButton(data.browserVersions, '.js-dm-browser-versions') }
				${renderDetailsDialogModal('js-dm-browser-versions',
					`<h1>Browser Version</h1>` +
					renderTable(data.browserVersions, {
						name: 'Browser',
						visits: function (item) {
							if (!item) return 'Views';
							return `${item.visits} ${formatToPercentageString((item.visits * 100) / data.visits.visits)}`;
						},
						unique: function (item) {
							if (!item) return 'Visitors';
							return `${item.unique} ${formatToPercentageString((item.unique * 100) / data.visits.unique)}`;
						},
					})
				)}
			</section>
		</bhdzllr-tabs>
	`;
}

function renderEvents() {
	sortDesc(data.events, 'total');

	const renderEventsTable = function (events, rows) {
		let rowCount = 0;

		return `
			<h2>Events</h2>

			<table>
				<thead>
					<tr>
						<th>Event</th>
						<th>CR</th>
						<th>Total</th>
					</tr>
				</thead>
				<tbody>
					${events.map(eventItem => {
						sortDesc(eventItem.contexts, 'total');

						if (rows && rows == rowCount) return;

						rowCount++;

					return `
					<tr class="event-goal-row">
						<td>${eventItem.name}</td>
						<td><small>${Math.round((eventItem.total * 100) / data.visits.visits)}&nbsp;%</small></td>
						<td>${eventItem.total}</td>
					</tr>
					<tr>
						<td colspan="2">
							<table>
								<thead>
									<tr>
										<th>Context</th>
										<th>Total</th>
									</tr>
								</thead>
								<tbody>
								${eventItem.contexts.map(eventContextItem => {
								return `
									<tr>
										<td>${eventContextItem.name}</td>
										<td>${eventContextItem.total}</td>
									</tr>
								`
								}).join('')}
								</tbody>
							</table>
						</td>
					</tr>
					`;
					}).join('')}
					${rowCount == 0 ? `<td colspan="2">No data available.</td>` : ''}
				</tbody>
			</table>
		`;
	}

	return `
		${renderEventsTable(data.events, OVERVIEW_TABLE_MAX_ROWS)}

		${renderDetailsButton(data.events, '.js-dm-events')}
		${renderDetailsDialogModal('js-dm-events',
			`<h1>Events</h1>` +
			renderEventsTable(data.events)
		)}
	`;
}

function renderLoading() {
	root.hidden = true;
	document.querySelector('.js-loader').hidden = false;
}

function render() {
	document.querySelector('.js-loader').hidden = true;
	root.hidden = false;

	root.innerHTML = `
		<article class="overview">
			<h2 class="screen-reader-text">Overview</h2>

			<div class="overview__stats">
				<section>
					<h3>Visitors</h3>
					<p>${formatNumber(data.visits.unique)}</p>
				</section>

				<section>
					<h3>Page Views</h3>
					<p>${formatNumber(data.visits.visits)}</p>
				</section>

				<section>
					<h3>Time on Page</h3>
					<p>${formatToMinutesAndSeconds(data.visits.context)}</p>
				</section>

				<section>
					<h3 title="Live views in the last 3 minutes">Live Views</h3>
					<p class="js-overview-live">0</p>
				</section>
			</div>

			<div class="chart-container js-chart-container">
				${setTimeout(() => renderChart())}
			</div>
		</article>

		<div class="details">
			<article>
				${renderPages()}
			</article>

			<article>
				${renderSources()}
			</article>

			<article>
				${renderCountries()}
			</article>

			<article>
				${renderDevices()}
			</article>

			<article>
				${renderEvents()}
			</article>
		</div>
	`;

	addDialogModalDefaultStyles();
	initDialogsModalWithTemplate();

	setTimeout(() => window.scrollTo(0, 0)); // Render jump fix
}

function sortAsc(data, key) {
	data.sort(function (a, b) {
		if (a[key] < b[key]) return -1;
		if (a[key] > b[key]) return 1;
		return 0;
	});
}

function sortDesc(data, key) {
	data.sort(function (a, b) {
		if (a[key] < b[key]) return 1;
		if (a[key] > b[key]) return -1;
		return 0;
	});
}

function formatNumber(num) {
	let numFormatted = num;

	if (num > 999999) {
		numFormatted = (num / 1000000).toString().substring(0, 4) + 'm';
	} else if (num > 100000) {
		numFormatted = (num / 1000).toString().substring(0, 8) + 'k';
	} else if (num > 10000) {
		numFormatted = (num / 1000).toString().substring(0, 5) + 'k';
	} else if (num > 1000) {
		numFormatted = (num / 1000).toString().substring(0, 3) + 'k';
	}

	return numFormatted;
}

function formatToMinutesAndSeconds(num) {
	const fullSeconds = Math.round(num);
	const minutes = Math.floor(fullSeconds / 60);
	const seconds = fullSeconds - minutes * 60;

	if (minutes == 0) return `${seconds}s`;
	if (seconds == 0) return `${minutes}m`;

	return `${minutes}m ${seconds}s`;
}

function formatToPercentageString(num) {
	return `<small>(${Math.round(num)}&nbsp;%)</small>`;
}

function isFocusable(element) {
	if (element.tabIndex > 0 || (element.tabIndex === 0 && element.getAttribute('tabIndex') !== null)) return true;

	if (element.disabled) return false;

	switch (element.nodeName) {
		case 'A':
			return !!element.href && element.rel != 'ignore';
		case 'INPUT':
			return element.type != 'hidden' && element.type != 'file';
		case 'BUTTON':
		case 'SELECT':
		case 'TEXTAREA':
			return true;
		default:
			return false;
	}
}

class DialogModal {

	constructor({
		contentAsHtml,
		showOnCreation = false,
		showCallback = null,
		hideCallback = null,
		ariaLabelledBy = '',
		hideRootScrollbars = true,
	}) {
		this.contentAsHtml = contentAsHtml;
		this.showOnCreation = showOnCreation;
		this.showCallback = showCallback;
		this.hideCallback = hideCallback;
		this.ariaLabelledBy = ariaLabelledBy;
		this.hideRootScrollbars = hideRootScrollbars;

		this.overlay;
		this.dialog;
		this.btnClose;
		this.firstFocusableElement;
		this.lastFocusableElement;
		this.lastElement;
		this.isOpen = false;

		this.initDom();
		this.initListeners();

		if (this.showOnCreation) this.show();
	}

	initDom() {
		this.overlay = document.createElement('div');
		this.overlay.classList.add('dm-overlay');
		this.overlay.classList.add('js-dm-overlay');
		this.overlay.classList.add('hidden');
		this.overlay.hidden = true;

		this.dialog = document.createElement('div');
		this.dialog.classList.add('dm-dialog');
		this.dialog.classList.add('js-dm-dialog');
		this.dialog.setAttribute('role', 'dialog');
		this.dialog.setAttribute('aria-modal', 'true'); // Tell screenreaders that content behind the modal is not interactive
		this.dialog.setAttribute('aria-labelledby', this.ariaLabelledBy); // Tell screenreaders the ID of the title element
	
		this.setContentAsHtml(this.contentAsHtml);

		this.btnClose = document.createElement('button');
		this.btnClose.classList.add('dm-btn-close');
		this.btnClose.classList.add('js-dm-btn-close');
		this.btnClose.setAttribute('aria-label', 'Close');
		this.btnClose.innerHTML = `<span aria-hidden="true">&times;</span>`;

		this.overlay.appendChild(this.btnClose);
		this.overlay.appendChild(this.dialog);
		document.body.appendChild(this.overlay);
	}

	initListeners() {
		let overlayMouseDownTarget;

		this.btnClose.addEventListener('click', () => {
			this.hide();
		});

		this.overlay.addEventListener('mousedown', (e) => {
			overlayMouseDownTarget = e.target;
		});

		this.overlay.addEventListener('mouseup', (e) => {
			if (overlayMouseDownTarget && overlayMouseDownTarget.classList.contains('js-dm-overlay')) {
				this.hide();
			}
		});

		document.addEventListener('keyup', (e) => {
			if (e.keyCode != 27) return;

			let overlay = document.querySelector('.js-dm-overlay');
			if (overlay) this.hide();
		});

		this.handleFirstFocusableElementHandler = this.handleFirstFocusableElement.bind(this);
		this.handleLastFocusableElementHandler = this.handleLastFocusableElement.bind(this);
	}

	setContentAsHtml(contentAsHtml) {
		this.contentAsHtml = contentAsHtml;
		this.dialog.innerHTML = contentAsHtml;

		const childNodes = this.getFocusableChildNodes();

		if (!Boolean(childNodes.length)) return;

		this.firstFocusableElement = childNodes[0];
		this.lastFocusableElement = childNodes[childNodes.length - 1];

		this.setFirstFocusableElement(this.firstFocusableElement);
		this.setLastFocusableElement(this.lastFocusableElement);
	}

	setFirstFocusableElement(firstFocusableElement) {
		if (this.firstFocusableElement) this.firstFocusableElement.removeEventListener('keydown', this.handleFirstFocusableElementHandler);
		this.firstFocusableElement = firstFocusableElement;
		this.firstFocusableElement.addEventListener('keydown', this.handleFirstFocusableElementHandler);
	}

	setLastFocusableElement(lastFocusableElement) {
		if (this.lastFocusableElement) this.lastFocusableElement.removeEventListener('keydown', this.handleLastFocusableElementHandler);
		this.lastFocusableElement = lastFocusableElement;
		this.lastFocusableElement.addEventListener('keydown', this.handleLastFocusableElementHandler);
	}

	handleFirstFocusableElement(e) {
		if (e.shiftKey && e.keyCode == 9) {
			e.preventDefault();
			this.focusLastFocusableElement();
		}
	}

	handleLastFocusableElement(e) {
		if (e.keyCode == 9 && !(e.shiftKey && e.keyCode == 9)) {
			e.preventDefault();
			this.focusFirstFocusableElement();
		}
	}

	focusFirstFocusableElement() {
		if (this.firstFocusableElement) this.firstFocusableElement.focus();
	}

	focusLastFocusableElement() {
		if (this.lastFocusableElement) this.lastFocusableElement.focus();
	}

	focusLastDocumentElement() {
		if (this.lastElement) this.lastElement.focus();
	}

	show() {
		this.lastElement = document.activeElement;

		if (this.hideRootScrollbars) {
			document.documentElement.style.overflow = 'hidden';
			document.body.style.overflow = 'hidden';
		}

		this.overlay.classList.remove('hidden');
		this.overlay.hidden = false;
		this.isOpen = true;

		this.focusFirstFocusableElement();

		if (this.showCallback) this.showCallback();
	}

	hide() {
		if (this.hideRootScrollbars) {
			document.documentElement.style.overflow = 'auto';
			document.body.style.overflow = 'auto';
		}

		this.overlay.classList.add('hidden');
		this.overlay.hidden = true;
		this.isOpen = false;

		this.focusLastDocumentElement();

		if (this.hideCallback) this.hideCallback();
	}

	isActive() {
		return this.isOpen;
	}

	remove() {
		this.overlay.parentNode.removeChild(this.overlay);
	}

	getFocusableChildNodes() {
		const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
		const childNodesOverlay = Array.prototype.slice.call(this.overlay.querySelectorAll(focusableSelector));
		const childNodesDialog = Array.prototype.slice.call(this.dialog.querySelectorAll(focusableSelector));
		let childNodesComponents = [];

		const components = Array.prototype.slice.call(this.dialog.querySelectorAll('*')).filter((element) => {
			if (element.tagName.includes('-')) return element; 
		});

		for (const component of components) {
			if (!!component.shadowRoot) {
				childNodesComponents = childNodesComponents.concat(Array.prototype.slice.call(component.shadowRoot.querySelectorAll(focusableSelector)));
			}
		}

		return childNodesOverlay.concat(childNodesDialog).concat(childNodesComponents).filter(function (node) {
			return isFocusable(node);
		})
	}

}

function initDialogsModalWithTemplate() {
	if (document.querySelector('[data-dm]')) {
		const dialogModalTriggers = document.querySelectorAll('[data-dm]');

		for (let i = 0; i < dialogModalTriggers.length; i++) {
			const target = dialogModalTriggers[i].dataset.dm;

			if (document.querySelector(target)) {
				const template = document.querySelector(target);
				const templateClone = document.importNode(template.content, true);
				const tempDiv = document.createElement('div');
				tempDiv.appendChild(templateClone);

				const dialogModal = new DialogModal({ contentAsHtml: tempDiv.innerHTML });

				dialogModalTriggers[i].addEventListener('click', function (e) {
					e.preventDefault();
					dialogModal.show();
				});
			}
		}
	}
}

function addDialogModalDefaultStyles() {
	if (document.querySelector('#js-dm-styles')) return;

	const style = document.createElement('style');
	style.id = 'js-dm-styles';

	style.innerHTML = `
		.dm-overlay {
			position: fixed;
			top: 0;
			right: 0;
			bottom: 0;
			left: 0;
			z-index: 100;

			display: block;
			padding: 3.5em 1.5em 1.5em;
			overflow-y: auto;

			background-color: rgba(0, 0, 0, 0.75);
		}

		.dm-overlay.hidden {
			display: none;
		}

		.dm-btn-close {
			position: absolute;
			top: 5px;
			right: 0.45em;

			display: inline-block;
			width: 35px;
			height: 50px;

			background: transparent;
			border: none;
			cursor: pointer;

			color: #ffffff;
			font-size: 35px;
		}

		.dm-dialog {
			position: relative;

			display: block;
			width: 100%;
			max-width: 900px;
			margin: 0 auto 3em;

			background-color: #ffffff;
		}

		.dm-dialog__container {
			padding: 1em;
		}

		.dm-template {
			display: none;
		}
	`;

	document.head.appendChild(style);
}

const KEYCODE = {
	TAB: 9,
	DOWN: 40,
	LEFT: 37,
	RIGHT: 39,
	UP: 38,
	HOME: 36,
	END: 35,
};

const tabsTemplate = document.createElement('template');
tabsTemplate.innerHTML = `
	<style>
		:host {
			display: block;
		}

		:host([hidden]) {
			display: none;
		}
	</style>
	<div class="tabs">
		<div class="js-tablist" role="tablist">
			<slot id="tab" name="tab" class="js-tab"></slot>
		</div>

		<slot id="tabpanel" name="tabpanel" class="js-tabpanel"></slot>
	</div>
`;

class Tabs extends HTMLElement {

	constructor() {
		super();

		this.attachShadow({ mode: 'open' });
		this.shadowRoot.appendChild(tabsTemplate.content.cloneNode(true));

		this.tabList = this.shadowRoot.querySelector('.js-tablist');
		this.tabsSlot = this.shadowRoot.querySelector('.js-tab');
		this.tabPanelsSlot = this.shadowRoot.querySelector('.js-tabpanel');

		this.observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.attributeName === 'selected') {
					this.selectTab(mutation.target.dataset.index);
				}
			});
		});
	}

	connectedCallback() {
		if (!this.hasAttribute('wa-aria-label')) console.warn('[Tabs] No "wa-aria-label" attribute set to use for "aria-label".');

		if (this.hasAttribute('wa-aria-label')) this.tabList.setAttribute('aria-label', this.getAttribute('wa-aria-label'));
	
		this.onSlotChangeHandler = this.onSlotChange.bind(this);
		this.onKeyDownHandler = this.onKeyDown.bind(this);

		this.tabsSlot.addEventListener('slotchange', this.onSlotChangeHandler);
		this.tabPanelsSlot.addEventListener('slotchange', this.onSlotChangeHandler);

		for (const [i, tab] of this.getTabs().entries()) {
			tab.addEventListener('click', (e) => {
				e.preventDefault();
				e.target.setAttribute('selected', '');
			});
		}

		this.addEventListener('keydown', this.onKeyDownHandler);

		this.startSelectedObserver();
	}

	disconnectedCallback() {
		this.removeEventListener('keydown', this.onKeyDownHandler);

		this.stopSelectedObserver();
	}

	onSlotChange(e) {
		const tabs = this.getTabs();
		const tabPanels = this.getTabPanels();
		let isATabSelected = false;

		for (const [i, tab] of tabs.entries()) {
			let isTabSelected = tab.hasAttribute('selected') ? true : false;
			let tabId = tab.id ? tab.id : 'bhdzllr-tabs-tab-' + i;

			tab.setAttribute('id', tabId);
			tab.setAttribute('role', 'tab');
			tab.setAttribute('aria-selected', `${isTabSelected}`);
			if (!tab.hasAttribute('aria-controls')) tab.setAttribute('aria-controls', 'bhdzllr-tabs-panel-' + i);
			tab.setAttribute('tabindex', `${isTabSelected ? '0' : '-1'}`);
			tab.dataset.index = i;

			if (isTabSelected) isATabSelected = true;

			if (!tabPanels[i]) {
				console.warn('[Tabs] There are more tabs defined than panels.');
				break;
			}

			const tabPanel = tabPanels[i];
			tabPanel.setAttribute('id', tab.getAttribute('aria-controls'));
			tabPanel.setAttribute('role', 'tabpanel');
			tabPanel.setAttribute('aria-labelledby', tab.id);
			tabPanel.setAttribute('tabindex', '0');
			tabPanel.hidden = !isTabSelected;
		}

		
		if (!isATabSelected) {
			this.selectTab(0);
		}
	}

	onKeyDown(e) {
		if (e.altKey) return;
		if (e.keyCode == KEYCODE.TAB) return;

		e.preventDefault();

		if (e.target.getAttribute('role') !== 'tab') return;

		const tabs = this.getTabs();
		let currentTab = 0;
		let newTab = 0;

		for (const [i, tab] of tabs.entries()) {
			if (tab.hasAttribute('selected')) currentTab = i;
		}

		switch (e.keyCode) {
			case KEYCODE.LEFT:
			case KEYCODE.UP:
				newTab = currentTab - 1;
				break;
			case KEYCODE.RIGHT:
			case KEYCODE.DOWN:
				newTab = currentTab + 1;
				break;
			case KEYCODE.HOME:
				break;
			case KEYCODE.END: 
				newTab = tabs.length - 1;
			default:
				return;
		}

		if (newTab < 0) newTab = tabs.length - 1;
		if (newTab > (tabs.length - 1)) newTab = 0;

		this.selectTab(newTab);
	}

	startSelectedObserver() {
		for (const tab of this.getTabs()) {
			this.observer.observe(tab, {
				attributes: true,
			});
		}
	}

	stopSelectedObserver() {
		this.observer.disconnect();
	}

	selectTab(index) {
		const tabs = this.getTabs();
		const tabPanels = this.getTabPanels();

		this.stopSelectedObserver();

		for (const [i, tab] of tabs.entries()) {
			if (i != index) {
				tab.setAttribute('aria-selected', 'false');
				tab.setAttribute('tabindex', '-1');
				if (tab.hasAttribute('selected')) tab.removeAttribute('selected');
				continue;
			}

			tab.setAttribute('aria-selected', 'true');
			tab.setAttribute('tabindex', '0');
			if (!tab.hasAttribute('selected')) tab.setAttribute('selected', '');

			tab.focus();
		}

      	for (const [i, tabPanel] of tabPanels.entries()) {
      		if (i != index) {
      			tabPanel.hidden = true;
      			continue;
      		}

      		tabPanel.hidden = false;
      	}

      	this.startSelectedObserver();
	}

	getTabs() {
		return this.tabsSlot.assignedNodes();
	}

	getTabPanels() {
		return this.tabPanelsSlot.assignedNodes();
	}

}

customElements.define('bhdzllr-tabs', Tabs);
