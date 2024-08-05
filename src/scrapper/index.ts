import { readFile, writeFile, mkdir } from "fs/promises";
import { JSDOM } from "jsdom";

const ThumbnailsDir = "./public/thumbnails"
const HTMLDataPath = "./src/scrapper/htmlData.json"
const StorePath = "./src/store.json"

await (async function() {
    let data: Data = {}

    const jsonData = await readFile(HTMLDataPath, "utf-8");
    const htmlData: HTMLData = JSON.parse(jsonData ?? "{}");

    // Create a folder to store the images
    await mkdir(ThumbnailsDir, { recursive: true });

    for (const html of htmlData.snapshots) {
        console.log("Extracting data...")
        await genDataFromHTML(html, data);
    }

    console.log("Extraction finished")

    const dataJson = JSON.stringify(data, undefined, 2);
    await writeFile(StorePath, dataJson);
})()

async function genDataFromHTML(html: string, data: Data) {
    const { window: { document } } = new JSDOM(html);
    const domData = extractData(document);

    const promises = [];
    for (const [sectionTitle, section] of Object.entries(domData)) {
        data[sectionTitle] = data[sectionTitle] || {};

        for (const [movieTitle, movieImgUrl] of Object.entries(section)) {
            // Create a promise that will download the image and save the image path in the data
            let promise = downloadImage(movieImgUrl, ThumbnailsDir)
                          .then((path) => { data[sectionTitle][movieTitle] = path });

            promises.push(promise);
        }
    }

    await Promise.allSettled(promises)
}

function extractData(document: Document): DomData {
    const data: DomData = {};

    // Example:
    //   <div class="lolomoRow">
    //     <div class="row-header-title">...</div>
    //     <div class="slider">
    //       <div class="slider-item">...</div>
    //       <div class="slider-item">...</div>
    //       <div class="slider-item">...</div>
    //     </div>
    //   </div>
    //
    // A "slider-item":
    //   <div class="slider-item">
    //     <img class="boxart-image" src="..." />
    //     <p class="fallback-text">...</p>
    //   </div>

    for (const row of document.querySelectorAll(".lolomoRow")) {
        const sectionTitle = sanitize(row.querySelector(".row-header-title")?.textContent ?? "");
        if (!sectionTitle) {
            continue;
        }

        const section: DomSection = {}
        for (const item of row.querySelectorAll(".slider-item")) {
            const movieTitle = sanitize(item.querySelector(".fallback-text")?.textContent ?? "")
            const imageUrl = item.querySelector<HTMLImageElement>(".boxart-image")?.src;

            if (movieTitle && imageUrl) {
                section[movieTitle] = imageUrl
            }
        }

        data[sectionTitle] = section;
    }

    return data;
}

async function downloadImage(url: string, outDir: string) {
    const resp = await fetch(url);
    if(resp.status === 200) {
        // Get the file type and use it to find the file extension to use.
        const fileType = resp.headers.get("Content-Type")?.split("/").pop() || "jpeg"
        const fileExt = getFileExt(fileType);

        const buffer = await resp.arrayBuffer();
        const fileHash = await genHashFromBuffer(buffer);
        const filepath = outDir + "/" + fileHash + "." + fileExt;
        await writeFile(filepath, new DataView(buffer));
        return filepath;
    } else {
        throw new Error("Couldn't fetch image: " + url);
    }
}

async function genHashFromBuffer(buffer: ArrayBuffer) {
    const hash = await crypto.subtle.digest("SHA-256", buffer);
    const byteArr = new Uint8Array(hash);
    const hashStr = byteArr.reduce((acc, byte) => {
        return acc + byte.toString(16);
    }, "")
    return hashStr;
}

function getFileExt(fileType: string) {
    switch(fileType) {
        case "jpeg":
            return "jpg";
        default:
            return fileType;
    }
}

function sanitize(str: string) {
    // Replace whitespace characters with a single space and trim any extra spaces at the end
    return str.replaceAll(/\s+/g, " ").trim();
}

type SectionTitle = string;
type MovieTitle = string;
type ImageUrl = string;
type ImagePath = string;

type Data = Record<SectionTitle, Section>
type Section = Record<MovieTitle, ImageUrl>

type DomData = Record<SectionTitle, DomSection>
type DomSection = Record<MovieTitle, ImagePath>

type HTMLData = {
    snapshots: string[]
}


