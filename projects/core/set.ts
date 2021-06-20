export function set<T>(item: T, valuesToSet: Partial<T>): T {
    if (valuesToSet)
        Object.assign(item, valuesToSet);
    return item;
}