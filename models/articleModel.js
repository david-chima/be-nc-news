const connection = require("../db/connection");

/*  Selects all articles by default or all articles with the given article_id if supplied
 */
exports.selectArticles = (
  { sort_by = "created_at", order = "desc", author, topic },
  article_id
) => {
  if (order !== "asc" && order !== "desc")
    return Promise.reject({ code: 22023 });

  if (article_id && isNaN(parseInt(article_id)))
    return Promise.reject({ code: 22023 });

  const selectedColumns = [
    "articles.author",
    "articles.title",
    "articles.article_id",
    "articles.topic",
    "articles.created_at",
    "articles.votes"
  ];

  if (article_id) selectedColumns.push("articles.body"); // Include the body if we're asking for results for a single article

  return connection("articles")
    .select(selectedColumns)
    .count("articles.article_id as comment_count")
    .leftJoin("comments", "articles.article_id", "comments.article_id")
    .groupBy("articles.article_id")
    .modify(queryBuilder => {
      queryBuilder.orderBy(sort_by, order);
      if (author) queryBuilder.where("articles.author", "=", author);
      if (topic) queryBuilder.where("articles.topic", "=", topic);
      if (article_id)
        queryBuilder.having("articles.article_id", "=", article_id);
    })
    .then(result => {
      // console.log("result: " + JSON.stringify(result));
      if (result.length === 0) return Promise.reject({ code: 22023 });
      else if (article_id) {
        const [article] = result; //Remove the article from the array if this was a request for a single article
        return article;
      } else return result;
    });
};

exports.updateArticle = (params, votes = 0) => {
  return connection("articles")
    .increment("votes", votes)
    .where(params)
    .returning("*")
    .then(result => {
      // console.log("returning: " + JSON.stringify(result));
      if (result.length === 0)
        return Promise.reject({ msg: "Article not found!", status: 404 });
      else return result[0];
    });
};

exports.selectComments = (
  { sort_by = "created_at", order = "desc" },
  article_id
) => {
  const selectedColumns = [
    "comments.comment_id",
    "comments.author",
    "comments.votes",
    "comments.created_at",
    "comments.body"
  ];

  return connection("articles")
    .select(selectedColumns)
    .join("comments", "articles.article_id", "comments.article_id")
    .where("comments.article_id", "=", article_id)
    .modify(queryBuilder => {
      queryBuilder.orderBy(sort_by, order);
    })
    .then(result => {
      // console.log("result: " + JSON.stringify(result));

      if (result.length === 0)
        return Promise.reject({ msg: "Article not found!", status: 404 });
      else return result;
    });
};

exports.insertComment = (params, body) => {
  const commentVariables = {};
  commentVariables.author = body.username;
  commentVariables.article_id = params.article_id;
  commentVariables.body = body.body;
  // console.log(JSON.stringify(commentVariables));

  return connection("comments")
    .insert(commentVariables)
    .returning("*")
    .then(([result]) => {
      // console.log("returning: " + JSON.stringify(result));

      //TODO: Not sure whether to handle 404 errors like this... think about it when you're feeling better
      //... that said, this is causing the catch block to receive a blank object anyway

      // if (result.length === 0)
      //   return Promise.reject({ msg: "Page not Found!", error: 404 });
      // else return result;

      return result;
    });
};
