const BEARER = "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
const FEATURES = {
	rweb_video_screen_enabled: false,
	creator_subscriptions_tweet_preview_api_enabled: true,
	tweepy_unmention_optimization_enabled: true,
	tweetypie_unmention_optimization_enabled: true,
	responsive_web_edit_tweet_api_enabled: true,
	graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
	view_counts_everywhere_api_enabled: true,
	longform_notetweets_consumption_enabled: true,
	responsive_web_twitter_article_tweet_consumption_enabled: true,
	tweet_awards_web_tipping_enabled: false,
	freedom_of_speech_not_reach_fetch_enabled: true,
	standardized_nudges_misinfo: true,
	tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
	longform_notetweets_rich_text_read_enabled: true,
	longform_notetweets_inline_media_enabled: true,
	responsive_web_enhance_cards_enabled: false,
};
const TWEET_DETAIL_ID = "wjV7NuWEsHgTBFfW3zYKzQ";

const msg = document.getElementById("msg");

function fail(text) {
	msg.textContent = text;
	console.error("[OTD video]", text);
}

function bestMp4(videoInfo) {
	const variants = (videoInfo && videoInfo.variants) || [];
	const mp4 = variants
		.filter((v) => v.content_type === "video/mp4" && v.url)
		.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
	if (mp4.length) return mp4[0].url;
	const any = variants.find((v) => v.url);
	return any ? any.url : null;
}

function play(url, poster) {
	if (!url) return fail("no playable variant in this tweet");
	const video = document.createElement("video");
	video.controls = true;
	video.autoplay = true;
	video.playsInline = true;
	if (poster) video.poster = poster;
	video.src = url;
	video.addEventListener("error", () => fail("this video could not be loaded"));
	msg.replaceWith(video);
	video.play().catch(() => {});
}

function findMedia(node, out) {
	if (!node || typeof node !== "object") return;
	const legacy = node.legacy;
	if (legacy && legacy.extended_entities && Array.isArray(legacy.extended_entities.media)) {
		for (const m of legacy.extended_entities.media) {
			if (m && m.video_info) out.push({ tweetId: legacy.id_str, media: m });
		}
	}
	for (const k in node) findMedia(node[k], out);
}

async function tweetVideo(tweetId) {
	const ct0Cookie = await new Promise((resolve) => {
		try {
			chrome.cookies.get({ url: "https://x.com", name: "ct0" }, (c) => resolve(c ? c.value : ""));
		} catch (e) {
			resolve("");
		}
	});
	const variables = {
		focalTweetId: tweetId,
		with_rux_injections: false,
		includePromotedContent: false,
		withCommunity: false,
		withQuickPromoteEligibilityTweetFields: false,
		withBirdwatchNotes: false,
		withVoice: true,
		withV2Timeline: true,
	};
	const url = `https://x.com/i/api/graphql/${TWEET_DETAIL_ID}/TweetDetail?variables=` +
		encodeURIComponent(JSON.stringify(variables)) +
		"&features=" + encodeURIComponent(JSON.stringify(FEATURES));
	const res = await fetch(url, {
		credentials: "include",
		headers: {
			authorization: BEARER,
			"x-csrf-token": ct0Cookie,
			"x-twitter-active-user": "yes",
			"x-twitter-client-language": "en",
		},
	});
	if (!res.ok) return fail("tweet lookup failed (" + res.status + ")");
	const data = await res.json();
	const found = [];
	findMedia(data, found);
	if (!found.length) return fail("this tweet has no video");
	// Prefer the tweet that was asked for; the thread can contain other videos.
	const own = found.find((entry) => entry.tweetId === tweetId) || found[0];
	play(bestMp4(own.media.video_info), own.media.media_url_https);
}

(function main() {
	const params = new URLSearchParams(location.search);
	const orig = params.get("orig") || "";
	let origUrl;
	try {
		origUrl = new URL(orig);
	} catch (e) {
		return fail("bad player URL");
	}
	const direct = origUrl.searchParams.get("video_url") || params.get("video_url");
	if (direct) {
		return play(decodeURIComponent(direct), origUrl.searchParams.get("image_src") || params.get("image_src"));
	}
	const m = origUrl.pathname.match(/\/i\/videos\/tweet\/(\d+)/);
	if (m) return tweetVideo(m[1]);
	const alt = origUrl.searchParams.get("tweet_id") || params.get("tweet_id");
	if (alt) return tweetVideo(alt);
	fail("no video id in " + orig.slice(0, 80));
})();
