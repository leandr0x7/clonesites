
    window.setInterval(() => {
        params.forEach(config => fetchData(config));
    }, 10000);
    document.addEventListener('DOMContentLoaded', () => {
        params.forEach(config => fetchData(config));
    });
