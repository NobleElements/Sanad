export const linkify = (text) => {
  if (!text) return '';
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, function(url) {
    return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 underline break-all">' + url + '</a>';
  });
};
