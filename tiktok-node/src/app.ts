import express from "express";
const bodyParser = require("body-parser");
import { TTScraper } from "./BL";
import { IVideo } from "./Interfaces";
import { fetchVideoNoWaterMark } from "./main";

const TikTokScraper = new TTScraper();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const port = 3000;

const getFirstPageVideosFromUser = async (
  username: string,
  isGetAllVideos: boolean = true
) => {
  const fetchVideos = await TikTokScraper.getAllVideosFromUser(
    username,
    isGetAllVideos
  ); // second argument set to true to fetch the video without watermark
  const videoUrls = fetchVideos.map((video: IVideo) => video.directVideoUrl);

  return videoUrls;
};

app.get("/:username", async (req, res) => {
  await getFirstPageVideosFromUser(req.params.username, false)
    .then((videoUrls) => res.json({ data: videoUrls }))
    .catch((err) => res.json({ error: "Some error occurred" }));
});

app.post("/video", async (req, res) => {
  const reqUrl = req.body.url;
  await fetchVideoNoWaterMark(reqUrl)
    .then((videoUrl) => res.json({ data: videoUrl }))
    .catch((err) => res.json({ error: err }));
});

https: app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});
