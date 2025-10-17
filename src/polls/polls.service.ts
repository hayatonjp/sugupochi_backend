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

    // 4. `with()` の再現：取得したデータを1つのオブジェクトにまとめる
    const poll: Poll = {
        ...(pollData as any), // pollの基本情報
        poll_options: results[1].results, // 選択肢の配列
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
            data.expires_at?.toISOString(),
            data.passcode
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

