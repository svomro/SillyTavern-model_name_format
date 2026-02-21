function formatModelName(rawName) {
    if (!rawName) return "";

    let name = rawName;

    // 1. Remove common prefixes before the first hyphen (e.g., "openrouter - ", "proxy - ")
    //    We make sure there's text before the hyphen and a space after it.
    //    We don't want to accidentally strip the first part of a name like "gpt-4" if it doesn't have spaces.
    const prefixSlashMatch = name.match(/^[^/]*\/([^-]*)-/);
    if(prefixSlashMatch) {
       // e.g. "openrouter - qwen/qwen3-32b" -> "qwen/qwen3-32b"
         name = name.replace(/^[^/]*\//, '');
    } else {
         name = name.replace(/^[\w\s]+ - /, '');
    }
    
    // 2. Remove any remaining prefix before a slash if it exists
    if (name.includes('/')) {
        name = name.split('/')[1];
    }

    // 3. Remove trailing dates or version numbers (e.g., "- 0901", "- 20241022", "- 16k")
    //    This looks for a hyphen, a space (optional), and then digits at the end of the string.
    name = name.replace(/[- ]+\d{4,8}$/, '');
    
    // 4. If asked to discard stuff like "-32b", "-72b", "-8b" or sizes at the end
    name = name.replace(/[- ]+\d{1,3}[BbmMkK]$/, '');

    return name.trim();
}

console.log(formatModelName("openrouter - qwen/qwen3-32b")); // qwen3
console.log(formatModelName("api - claude - 3-5-sonnet - 20241022")); // claude - 3-5-sonnet
console.log(formatModelName("proxy - openai - gpt-4o - 0806")); // openai - gpt-4o
console.log(formatModelName("gpt-4-turbo-128k")); // gpt-4-turbo
console.log(formatModelName("llama-3-70b-instruct")); // llama-3-70b-instruct (kept because we only stripped easy 32b at very end)
