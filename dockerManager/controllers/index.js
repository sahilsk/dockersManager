/*
 * GET home page.
 */
exports.index = function (req, res) {
  res.render('index.ejs', {
    title: 'Upload Dockerfile',
    page: 'upload_dockerfile'
  });
};