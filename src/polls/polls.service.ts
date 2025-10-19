type Poll = {
    id: number;
    title: string;
    description: string | null;
    max_votes_per_user: number | null;
    expires_at: string; // ISO8601形式の日時文字列
    access_token: string;
    passcode: string;
    uuid: string;
    created_at: string;
    updated_at: string;
    poll_options: PollOption[];
    votes: Vote[];
};

type PollOption = {
    id: number;
    poll_uuid: number;
    text: string;
    order: number;
    created_at: string;
    updated_at: string;
};

type Vote = {
    id: number;
    poll_uuid: number;
    poll_option_id: number;
    voter_identifier: string;
    created_at: string;
    updated_at: string;
};

type CreatePollData = {
    title: string;
    description?: string | null;
    expires_at?: Date | null;
    options: string[];
    passcode?: string | null;
};

function randomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charsLength = chars.length;
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * charsLength));
    }
    return result;
}

/**
 * Dateオブジェクトを YYYY-MM-DD HH:MM:SS 形式の文字列に変換します。
 */
function formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * 現在時刻から10分進め、秒を59秒に設定したDateオブジェクトを返します。
 */
function getFutureTime(): string {
    // 1. 現在時刻を取得 (now)
    const date = new Date();

    // 2. JST（UTC+9）に変換
    const jstOffset = 9 * 60; // 9時間を分に変換
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const jst = new Date(utc + (jstOffset * 60000));

    // 3. 10分加算 (addMinutes(10))
    jst.setMinutes(jst.getMinutes() + 10);

    // 4. 秒を59秒に設定 (setSeconds(59))
    jst.setSeconds(59);

    // 5. YYYY-MM-DD HH:MM:SS 形式で返す
    const year = jst.getFullYear();
    const month = String(jst.getMonth() + 1).padStart(2, '0');
    const day = String(jst.getDate()).padStart(2, '0');
    const hours = String(jst.getHours()).padStart(2, '0');
    const minutes = String(jst.getMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

export const getPollByUuid = async (
    db: D1Database,
    uuid: string
): Promise<Poll | null> => {
    // 1. 実行したい3つのクエリを準備する
    const pollQuery = db.prepare('SELECT * FROM polls WHERE uuid = ?').bind(uuid);
    const optionsQuery = db.prepare('SELECT * FROM poll_options WHERE poll_uuid = ?').bind(uuid);
    const votesQuery = db.prepare('SELECT * FROM votes WHERE poll_uuid = ?').bind(uuid);

    // 2. `db.batch()` を使って3つのクエリを一度に実行
    const results = await db.batch([pollQuery, optionsQuery, votesQuery]);
    const pollData = results[0].results[0];

    // 3. firstOrFail() の再現：結果がなければnullを返す
    if (!pollData) {
        return null;
    }

    const optionsWithVotes = (results[1].results as PollOption[])?.map(option => {
        // この選択肢(option)のIDに一致する投票(vote)を allVotes から探す
        const relatedVotes = (results[2].results as Vote[]).filter(vote => vote.poll_option_id === option.id);

        // 既存の選択肢情報に、見つけた投票リストを追加して新しいオブジェクトを返す
        return {
            ...option,       // 元のoptionのプロパティをコピー
            votes: relatedVotes // votesプロパティを追加
        };
    });

    // 4. `with()` の再現：取得したデータを1つのオブジェクトにまとめる
    const poll: Poll = {
        ...(pollData as any), // pollの基本情報
        poll_options: optionsWithVotes, // 選択肢の配列
        votes: results[2].results,        // 投票結果の配列
    };

    return poll;
};

export const createPollWithWithOptions = async (
    db: D1Database,
    data: CreatePollData
) => {
    // 1. 新しいPollのUUIDを生成
    const pollUuid = crypto.randomUUID();

    // 2. 実行したいSQL文を `D1PreparedStatement` として準備する
    const pollInsert = db
        .prepare(
            'INSERT INTO polls (uuid, title, description, expires_at, passcode) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(
            pollUuid,
            data.title,
            data.description,
            data.expires_at ? formatDateTime(data.expires_at) : getFutureTime(),
            data.passcode ?? randomString(10),
        );

    const optionsInserts = data.options.map((optionText) =>
        db
            .prepare('INSERT INTO poll_options (poll_uuid, text) VALUES (?, ?)')
            .bind(pollUuid, optionText)
    );

    // 3. すべてのPreparedStatementを一つの配列にまとめる
    const statements = [pollInsert, ...optionsInserts];

    // 4. `db.batch()` を使ってトランザクションとして実行
    await db.batch(statements);

    // 5. 作成したPollのUUIDを返す
    return pollUuid;
};

export const getPollOptionsByPollUuid = async (
    db: D1Database,
    uuid: string
): Promise<PollOption[]> => {
    const poll = await db.prepare('SELECT id FROM polls WHERE uuid = ?').bind(uuid).first();
    if (!poll) {
        return [];
    }
    const options = await db.prepare('SELECT * FROM poll_options WHERE poll_uuid = ? ORDER BY "order" ASC').bind(poll.id).all();
    return options.results as PollOption[];
};