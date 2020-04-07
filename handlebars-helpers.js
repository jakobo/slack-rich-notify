const cut = (H) =>
  H.registerHelper("cut", (s, len) => {
    return H.SafeString(`${s}`.substring(0, len));
  });

module.exports = (H) => {
  cut(H);
};
