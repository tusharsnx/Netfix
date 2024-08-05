// Use this script to generate htmlData.json that can be used to scrape movie thumbnails from Netflix.
// 1. Open Netflix homepage as a logged in user.
// 2. Once the page is loaded, scroll down to the bottom so as to load all the sections (because some are loaded lazily after user scrolls to them)
// 3. Paste the below function and run it `await run()`.
// 4. Wait for it to capture all the snapshots of the page.
// 5. Take the json string output from the console and paste it in "scrapper/htmlData.json".

async function run() {
    let sliderNextBtns = [];
    for (const slider of document.querySelectorAll(".slider")) {
        let nextBtn = slider.querySelector(".handleNext");
        if (nextBtn && nextBtn.click) {
            sliderNextBtns.push(nextBtn);
        }
    }

    const sleep = (timeout) => new Promise((res) => { setTimeout(res, timeout) });
    const captureSnapshot = () => {
        console.log(`Snapshot taken`);
        snapshots.push(document.body.outerHTML);
    }

    let snapshots = []

    captureSnapshot();
    for (let i = 0; i < 2; i++) {
        for (const btn of sliderNextBtns) {
            btn.click();
            await sleep(600);
        }

        await sleep(1000);
        captureSnapshot();
    }

    const jsonData = JSON.stringify({ snapshots: snapshots }, undefined, 2);
    console.log("Captured snapshots: ");
    console.log(jsonData);
}