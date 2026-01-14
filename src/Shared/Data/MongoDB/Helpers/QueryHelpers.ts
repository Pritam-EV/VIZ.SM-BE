import { Model, type QueryOptions, type FilterQuery, type ProjectionType } from 'mongoose';

/**
 * Fetch documents in chunks using a cursor.
 * @param model - The Mongoose model to query.
 * @param filter - The filter query to apply.
 * @param projection - An object to project specific fields.
 * @param options - Additional query options (e.g., sort, batchSize [Default: 1000]). lean is always true.
 */
export async function* streamChunks<TDocument>(
    model: Model<TDocument>,
    filter: FilterQuery<TDocument>,
    projection: ProjectionType<Model<TDocument>>,
    options: QueryOptions = { batchSize: 1000, lean: true }): AsyncGenerator<(Readonly<TDocument>)[], void, void>
{
    const cursorOptions: QueryOptions = { batchSize: 1000 };
    if (options) {
        if (!options.lean) {
            options.lean = true;
        }
        if (options.batchSize) {
            cursorOptions.batchSize = options.batchSize;
            delete options.batchSize;
        }
        if (options.limit && options.limit < cursorOptions.batchSize!) {
            cursorOptions.batchSize = options.limit;
        }
    }
    else {
        options = { lean: true };
    }

    const cursor = model
        .find(filter || {}, projection || {}, options)
        .cursor(cursorOptions)
    ;

    try {
        let chunk: (Readonly<TDocument>)[] = [];

        for await (const doc of cursor) {
            chunk.push(doc as TDocument);
            if (chunk.length >= cursorOptions.batchSize!) {
                yield chunk;
                chunk = []; // Reset chunk after processing for the next batch
            }
        }

        // Process any remaining documents in the last chunk
        if (chunk.length > 0) {
            yield chunk;
        }
    }
    finally {
        await cursor.close(); // Ensure the cursor is closed
    }
}