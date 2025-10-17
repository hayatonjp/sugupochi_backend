import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createPollSchema } from './polls.schema'
import { getPollByUuid } from './polls.service'
import { createPollWithWithOptions } from './polls.service'
import { getPollOptionsByPollUuid } from './polls.service'

type Env = {
  DB: D1Database
}

const polls = new Hono<{ Bindings: Env }>()

// GET /api/polls/:uuid
polls.get('/:uuid', async (c) => {
    const { uuid } = c.req.param()

    // サービスを呼び出してデータを取得
    const poll = await getPollByUuid(c.env.DB, uuid)

    // firstOrFail() の再現：サービスからnullが返ってきたら404エラーを返す
    if (!poll) {
        return c.notFound()
    }

    // view('polls.show', compact('poll')) の再現：取得したデータをJSONで返す
    return c.json(poll)
})

// GET /api/polls/:uuid/results
polls.get('/:uuid/results', async (c) => {
    const { uuid } = c.req.param()

    // サービスを呼び出してデータを取得
    const poll = await getPollByUuid(c.env.DB, uuid)

    // firstOrFail() の再現：サービスからnullが返ってきたら404エラーを返す
    if (!poll) {
        return c.notFound()
    }

    const totalVotes = poll.votes ? poll.votes.length : 0;
    const latestVote = poll.votes && poll.votes.length > 0
        ? poll.votes.reduce((latest: any, vote: any) => {
                return new Date(vote.created_at) > new Date(latest.created_at) ? vote : latest;
            }, poll.votes[0])
        : null;

    const lastVoteDate = latestVote
        ? (() => {
                const diffMs = Date.now() - new Date(latestVote.created_at).getTime();
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                if (diffMinutes < 1) return 'たった今';
                if (diffMinutes < 60) return `${diffMinutes}分前`;
                const diffHours = Math.floor(diffMinutes / 60);
                if (diffHours < 24) return `${diffHours}時間前`;
                const diffDays = Math.floor(diffHours / 24);
                return `${diffDays}日前`;
            })()
        : '未投票';

    const expiresAt = new Date(poll.expires_at);
    const now = new Date();
    const diffInMinutes = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60));
    const isExpired = diffInMinutes < 0;
    const remainingTime = isExpired ? '終了' : `${diffInMinutes}分`;

    Object.assign(poll, {
        totalVotes,
        lastVoteDate,
        remainingTime,
        isExpired,
    });

    // view('polls.results', compact('poll')) の再現：取得したデータをJSONで返す
    return c.json(poll)
})

// GET /api/polls/:uuid/complete
polls.get('/:uuid/complete', async (c) => {
    const { uuid } = c.req.param();
    const poll = await getPollByUuid(c.env.DB, uuid);

    if (!poll) {
        return c.notFound();
    }

    // pollOptionsを取得してpollに追加（サービスで取得する場合は適宜修正）
    if (typeof poll.poll_options === 'undefined' && typeof c.env.DB !== 'undefined') {
        poll.poll_options = await getPollOptionsByPollUuid(c.env.DB, uuid);
    }

    const shareUrl = `${c.req.url.replace(/\/complete$/, '')}`; // 例: 完了画面のURLからshow画面のURLを生成

    return c.json({ poll, shareUrl });
})

// GET /api/polls/:uuid/vote/complete
polls.get('/:uuid/vote/complete', async (c) => {
    const { uuid } = c.req.param();
    const voterIdentifier = c.req.query('voterIdentifier');

    // Pollと関連votes, pollOptions, votesを取得
    const poll = await getPollByUuid(c.env.DB, uuid);

    if (!poll) {
        return c.notFound();
    }

    const totalVotes = poll.votes ? poll.votes.length : 0;
    const latestVote = poll.votes && poll.votes.length > 0
        ? poll.votes.reduce((latest: any, vote: any) => {
                return new Date(vote.created_at) > new Date(latest.created_at) ? vote : latest;
            }, poll.votes[0])
        : null;

    const lastVoteDate = latestVote
        ? (() => {
                const diffMs = Date.now() - new Date(latestVote.created_at).getTime();
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                if (diffMinutes < 1) return 'たった今';
                if (diffMinutes < 60) return `${diffMinutes}分前`;
                const diffHours = Math.floor(diffMinutes / 60);
                if (diffHours < 24) return `${diffHours}時間前`;
                const diffDays = Math.floor(diffHours / 24);
                return `${diffDays}日前`;
            })()
        : '未投票';

    return c.json({
        poll,
        voterIdentifier,
        totalVotes,
        lastVoteDate,
    });
});

// POST /api/polls
polls.post('/', zValidator('json', createPollSchema), async (c) => {
    const validatedData = c.req.valid('json');

    try {
        // サービスを呼び出してDBに書き込み、新しいPollのUUIDを受け取る
        const pollUuid = await createPollWithWithOptions(c.env.DB, validatedData);
        
        return c.json(
            {
                message: '投票を作成しました。',
                pollUuid: pollUuid, // フロントエンドにUUIDを返す
            },
            201
        );
    } catch (e: any) {
        console.error(e);
        return c.json({ message: '予期せぬエラーが発生しました' }, 500);
    }
});

// POST /api/polls/:uuid/vote
polls.post('/:uuid/vote', async (c) => {
    const { uuid } = c.req.param();
    const body = await c.req.json();

    // 必要な値を取得
    const poll_uuid = uuid;
    const poll_option_id = body.poll_option_id;

    // generateVoterIdentifier: IP, Accept-Language, Accept-Encoding, Sec-CH-UA, Sec-CH-UA-Platform, Sec-CH-UA-Mobile, 5分単位のタイムスタンプ
    function generateVoterIdentifier(req: typeof c.req) {
        const ip = req.header('x-forwarded-for') || req.header('cf-connecting-ip') || '';
        const acceptLanguage = req.header('accept-language') || '';
        const acceptEncoding = req.header('accept-encoding') || '';
        const secChUa = req.header('sec-ch-ua') || '';
        const secChUaPlatform = req.header('sec-ch-ua-platform') || '';
        const secChUaMobile = req.header('sec-ch-ua-mobile') || '';
        const timestamp = Math.floor(Date.now() / 1000 / 300); // 5分単位

        const components = [
            ip,
            acceptLanguage,
            acceptEncoding,
            secChUa,
            secChUaPlatform,
            secChUaMobile,
            timestamp,
        ].join('|');

        // Web Crypto APIでSHA-256ハッシュ
        const encoder = new TextEncoder();
        const data = encoder.encode(components);
        return crypto.subtle.digest('SHA-256', data).then((hashBuffer) => {
            return Array.from(new Uint8Array(hashBuffer))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
        });
    }

    try {
        // voterIdentifier生成
        const voter_identifier = await generateVoterIdentifier(c.req);

        // D1Databaseでvoteを保存する
        const db = c.env.DB;
        try {
            await db
                .prepare(
                    `INSERT INTO votes (poll_uuid, poll_option_id, voter_identifier, created_at) VALUES (?, ?, ?, datetime('now'))`
                )
                .bind(poll_uuid, poll_option_id, voter_identifier)
                .run();
        } catch (err) {
            console.error(err);
            return c.json({ message: '予期せぬエラーが発生しました' }, 500);
        }

        // 完了画面へリダイレクトURLを返す
        const voteCompleteUrl = `/api/polls/${uuid}/vote/complete?voterIdentifier=${voter_identifier}`;
        return c.json(
            {
                message: '投票が完了しました',
                voteCompleteUrl,
                voterIdentifier: voter_identifier,
            },
            201
        );
    } catch (e) {
        console.error(e);
        return c.json({ message: '予期せぬエラーが発生しました' }, 500);
    }
});

export default polls