import { state } from '../../core/state.js';
import { loadApexCharts } from '../../core/loader.js';

/**
 * Transforms health data into sorted arrays for ApexCharts.
 * Generates a continuous range of days to match calendar.
 */
function getChartData(days = 14) {
    const dates = [];
    const mood = [];
    const sleep = [];
    const water = [];

    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const dateKey = `${year}-${month}-${day}`;
        
        const entry = state.healthData[dateKey] || {};
        
        // Match calendar format
        dates.push(`${day}.${month}`);
        
        // Match calendar normalization logic
        let moodVal = entry.mood || 0;
        if (moodVal > 10) moodVal = Math.round(moodVal / 10);
        mood.push(moodVal);
        
        sleep.push(entry.sleep || 0);
        water.push(entry.water || 0);
    }
    
    return { dates, mood, sleep, water };
}

// Royal Violet Palette from grid.js
const MOOD_COLORS = {
    1: "#10002B", 2: "#240046", 3: "#3C096C", 4: "#5A189A", 
    5: "#7B2CBF", 6: "#9D4EDD", 7: "#C77DFF", 8: "#E0AAFF", 
    9: "#F2D5FF", 10: "#FFFFFF"
};

export async function renderVitalityPanels(containers) {
    await loadApexCharts();
    const data = getChartData(14);
    const isMobile = window.innerWidth < 768;
    
    const syncGroupId = 'vitality-sync';
    const commonYAxisLabel = { style: { colors: '#8e9297', fontSize: '10px' }, minWidth: isMobile ? 30 : 40 };
    
    // Shared X-Axis Config
    const commonXAxis = {
        categories: data.dates,
        labels: {
            show: true,
            style: { colors: '#8e9297', fontSize: isMobile ? '8px' : '10px' },
            hideOverlappingLabels: true,
            rotate: -45,
            rotateAlways: isMobile
        },
        axisTicks: { show: false },
        axisBorder: { show: false },
        crosshairs: { 
            show: true,
            stroke: { color: '#ffffff', width: 1, dashArray: 4 }
        }
    };

    // Shared Tooltip Config (Enables synchronization across all charts)
    const commonTooltip = {
        theme: 'dark',
        shared: true,
        intersect: false,
        followCursor: true,
        x: { show: true },
        y: { formatter: (v) => v !== null ? v : '-' }
    };

    // Calculate dynamic average for annotation
    const validMoods = data.mood.filter(v => v > 0);
    const avgMoodVal = validMoods.length > 0 ? (validMoods.reduce((a,b)=>a+b,0)/validMoods.length).toFixed(1) : "0";
    
    // 1. Mood Chart (Clean Curve)
    const moodOptions = {
        series: [{ name: 'Nálada', data: data.mood }],
        chart: {
            id: 'mood', group: syncGroupId, type: 'area',
            height: isMobile ? 150 : 200,
            toolbar: { show: false },
            zoom: { enabled: false },
            selection: { enabled: false },
            animations: { enabled: true, easing: 'easeinout', speed: 800 },
            dropShadow: { enabled: false } 
        },
        colors: ['#7B2CBF'],
        stroke: { curve: 'smooth', width: 3 },
        fill: {
            type: 'gradient',
            gradient: { shadeIntensity: 1, opacityFrom: 0.2, opacityTo: 0.05, stops: [0, 90, 100] }
        },
        yaxis: {
            min: 0, max: 10, tickAmount: 5,
            title: { text: isMobile ? "" : "Skóre", style: { color: '#8e9297', fontWeight: 600 } },
            labels: commonYAxisLabel
        },
        xaxis: commonXAxis,
        grid: { borderColor: '#2f3136', strokeDashArray: 4, padding: { bottom: -10 } },
        markers: { size: 3, strokeColors: '#7B2CBF', hover: { size: 6 } },
        dataLabels: { enabled: false }, 
        annotations: {
            yaxis: [
                { y: 0, y2: 3, fillOpacity: 0.1, fillColor: MOOD_COLORS[2] },
                { y: 3, y2: 6, fillOpacity: 0.1, fillColor: MOOD_COLORS[5] },
                { y: 6, y2: 10, fillOpacity: 0.1, fillColor: MOOD_COLORS[8] },
                {
                    y: avgMoodVal, borderColor: '#ffffff', borderWidth: 1,
                    label: {
                        text: isMobile ? `Ø ${avgMoodVal}` : `Průměr: ${avgMoodVal}/10`,
                        style: { color: '#fff', background: '#7B2CBF', padding: { left: 5, right: 5, top: 2, bottom: 2 } },
                        position: 'left', textAnchor: 'start', offsetX: isMobile ? 40 : 50
                    }
                }
            ]
        },
        tooltip: commonTooltip
    };

    // 2. Sleep Chart (Goal-Based Coloring)
    const sleepOptions = {
        series: [{ name: 'Spánek (h)', data: data.sleep }],
        chart: {
            id: 'sleep', group: syncGroupId, type: 'bar',
            height: isMobile ? 140 : 160,
            toolbar: { show: false },
            zoom: { enabled: false },
            selection: { enabled: false }
        },
        colors: [({ value }) => value >= 8 ? '#3ba55c' : '#7289da'],
        plotOptions: { 
            bar: { 
                borderRadius: 4, 
                columnWidth: '60%', 
                distributed: true, 
                dataLabels: { position: 'top' } 
            } 
        },
        dataLabels: {
            enabled: !isMobile,
            formatter: (v) => v > 0 ? v + 'h' : '',
            style: { fontSize: '10px', colors: ['#ffffff'] },
            offsetY: -20
        },
        yaxis: {
            min: 0, max: 10, tickAmount: 5,
            title: { text: isMobile ? "" : "Hodin", style: { color: '#8e9297', fontWeight: 600 } },
            labels: commonYAxisLabel
        },
        xaxis: commonXAxis,
        grid: { borderColor: '#2f3136', strokeDashArray: 4, padding: { top: -10, bottom: -10 } },
        annotations: {
            yaxis: [{
                y: 8, borderColor: '#3ba55c', strokeDashArray: 4, borderWidth: 1,
                label: { text: isMobile ? '8h' : 'Cíl 8h 🌙', style: { color: '#fff', background: '#3ba55c' } }
            }]
        },
        legend: { show: false }, 
        tooltip: commonTooltip
    };

    // 3. Water Chart (Focused & Clean)
    const waterOptions = {
        series: [{ name: 'Voda (sklenice)', data: data.water }],
        chart: {
            id: 'water', group: syncGroupId, type: 'line',
            height: isMobile ? 160 : 180,
            toolbar: { show: false },
            zoom: { enabled: false },
            selection: { enabled: false },
            dropShadow: { enabled: false } 
        },
        colors: ['#00e5ff'],
        stroke: { curve: 'smooth', width: 3 },
        dataLabels: { enabled: false }, 
        yaxis: {
            min: 0, max: 8, tickAmount: 4,
            title: { text: isMobile ? "" : "Sklenic", style: { color: '#8e9297', fontWeight: 600 } },
            labels: commonYAxisLabel
        },
        xaxis: commonXAxis,
        grid: { borderColor: '#2f3136', strokeDashArray: 4, padding: { top: -10 } },
        markers: { 
            size: 4, 
            strokeColors: '#00e5ff',
            colors: data.water.map(v => v >= 8 ? '#3ba55c' : '#00e5ff'), 
            hover: { size: 7 } 
        },
        annotations: {
            yaxis: [{
                y: 8, borderColor: '#00e5ff', strokeDashArray: 4, borderWidth: 1,
                label: { text: isMobile ? '8' : 'Cíl 8 💧', style: { color: '#fff', background: '#00e5ff' } }
            }]
        },
        tooltip: commonTooltip
    };

    new ApexCharts(document.querySelector(`#${containers.mood}`), moodOptions).render();
    new ApexCharts(document.querySelector(`#${containers.sleep}`), sleepOptions).render();
    new ApexCharts(document.querySelector(`#${containers.water}`), waterOptions).render();
}
