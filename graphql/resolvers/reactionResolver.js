const { GraphQLError } = require("graphql");
const User = require("../../models/User");
const Comment = require("../../models/Comment");
const CommentReaction = require("../../models/CommentReaction");

const COMMENTS_PER_PAGE = 10;

const reactionResolver = {
  Query: {
    async fetchComments(_, { quizId, page = 2, sortOrder = 1 }, { req }) {
      try {
        let comments = await Comment.find({ quizId, parentCommentId: null })
          .skip((page - 1) * COMMENTS_PER_PAGE)
          .limit(COMMENTS_PER_PAGE)
          .sort({ createdAt: sortOrder })
          .populate("userId", "username profilePicture")
          .lean();

        comments.forEach((comment) => {
          if (comment.mentions.length != 0) {
            comment.text = helperFunctions.formatText(
              comment.text,
              comment.mentions
            );
          }
        });

        if (req.isAuth) {
          const user = await User.findById(req.userId);
          if (user) {
            const userReactions = await CommentReaction.find({
              userId: req.userId,
              commentId: { $in: comments.map((c) => c._id) },
            });

            const commentsWithReaction = comments.map((comment) => {
              const userReaction = userReactions.find(
                (ur) => ur.commentId.toString() === comment._id.toString()
              );

              return {
                ...comment,
                reaction: userReaction ? userReaction.reaction : null,
              };
            });

            comments = commentsWithReaction;
          }
        }

        return comments;
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async fetchReplies(_, { commentId, page }, { req }) {
      try {
        let replies = await Comment.find({ parentCommentId: commentId })
          .skip((page - 1) * COMMENTS_PER_PAGE)
          .limit(COMMENTS_PER_PAGE)
          .populate("userId", "_id username profilePicture")
          .lean();

        replies.forEach((reply) => {
          if (reply.mentions.length != 0) {
            reply.text = helperFunctions.formatText(reply.text, reply.mentions);
          }
        });

        if (req.isAuth) {
          const user = await User.findById(req.userId);
          if (user) {
            const userReactions = await CommentReaction.find({
              userId: req.userId,
              commentId: { $in: replies.map((c) => c._id) },
            });

            const commentsWithReaction = replies.map((reply) => {
              const userReaction = userReactions.find(
                (ur) => ur.commentId.toString() === reply._id.toString()
              );

              return {
                ...reply,
                reaction: userReaction ? userReaction.reaction : null,
              };
            });

            replies = commentsWithReaction;
          }
        }

        return replies;
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },
  },

  Mutation: {
    // createComment(CommentInput: CommentInputData!): Status!
    // updateComment(CommentInput: CommentInputData!): Status!
    // deleteComment(commentId: String!): Status!
    // updateCommentReaction(commentId: String!, status: ReactionStatus!): Status!

    async createComment(_, { CommentInput }, { req }) {
      const { quizId, parentCommentId, text } = CommentInput;

      if (!req.isAuth) {
        throw new GraphQLError("Not Authenticated!", {
          extensions: { code: 401 },
        });
      }

      try {
        const user = await User.findById(req.userId);
        if (!user) {
          throw new GraphQLError("User Not Found!", {
            extensions: { code: 404 },
          });
        }

        let parentComment;
        if (parentCommentId) {
          parentComment = await Comment.findById(parentCommentId);
          if (!parentComment) {
            throw new GraphQLError("Root comment Not Found!", {
              extensions: { code: 404 },
            });
          }
          parentComment.repliesCount++;
          await parentComment.save();
        }

        const mentions = await helperFunctions.extractMentions(text);

        const comment = new Comment({
          userId: req.userId,
          quizId,
          parentCommentId,
          mentions,
          text,
        });

        const savedComment = await comment.save();
        if (savedComment.mentions) {
          savedComment.text = helperFunctions.formatText(
            savedComment.text,
            savedComment.mentions
          );
        }

        return savedComment.populate("userId", "username profilePicture");
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async updateComment(_, { CommentInput }, { req }) {
      ({ _id, text } = CommentInput);

      if (!req.isAuth) {
        throw new GraphQLError("Not Authenticated!", {
          extensions: { code: 401 },
        });
      }

      try {
        const user = await User.findById(req.userId);
        if (!user) {
          throw new GraphQLError("User Not Found!", {
            extensions: { code: 404 },
          });
        }

        const mentions = await helperFunctions.extractMentions(text);

        const comment = await Comment.findById(_id);
        if (!comment) {
          throw new GraphQLError("Comment Not Found!", {
            extensions: { code: 404 },
          });
        }

        comment.mentions = mentions;
        comment.text = text;

        const savedComment = await comment.save();
        if (savedComment.mentions) {
          savedComment.text = helperFunctions.formatText(
            savedComment.text,
            savedComment.mentions
          );
        }

        return savedComment.populate("userId", "_id username profilePicture");
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async deleteComment(_, { commentId }, { req }) {
      if (!req.isAuth) {
        throw new GraphQLError("Not Authenticated!", {
          extensions: { code: 401 },
        });
      }

      try {
        const user = await User.findById(req.userId);
        if (!user) {
          throw new GraphQLError("User Not Found!", {
            extensions: { code: 404 },
          });
        }

        const comment = await Comment.findById(commentId).populate(
          "parentCommentId",
          "repliesCount"
        );

        if (!comment.parentCommentId) {
          const deleteReplies = await Comment.deleteMany({
            parentCommentId: commentId,
          });
          console.log(`deleted ${deleteReplies.deletedCount} replies`);
        } else {
          comment.parentCommentId.repliesCount--;
          await comment.parentCommentId.save();
        }

        const deleteStatus = await comment.deleteOne();

        if (deleteStatus.deletedCount > 0) {
          return { Success: true };
        } else {
          throw new GraphQLError("Not Authorized", {
            extensions: { code: 403 },
          });
        }
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },

    async updateCommentReaction(_, { commentId, reaction }, { req }) {
      if (!req.isAuth) {
        throw new GraphQLError("Not Authenticated!", {
          extensions: { code: 401 },
        });
      }

      try {
        const user = await User.findById(req.userId);
        if (!user) {
          throw new GraphQLError("User Not Found!", {
            extensions: { code: 404 },
          });
        }

        const comment = await Comment.findById(commentId);
        if (!comment) {
          throw new GraphQLError("Comment Not Found!", {
            extensions: { code: 404 },
          });
        }

        const userReaction = await CommentReaction.findOne({
          userId: req.userId,
          commentId,
        });

        if (userReaction) {
          if (userReaction.reaction === reaction) {
            await CommentReaction.findByIdAndDelete(userReaction._id);
            comment.reactionCount[reaction]--;
            await comment.save();
          } else {
            comment.reactionCount[userReaction.reaction]--;
            comment.reactionCount[reaction]++;
            userReaction.reaction = reaction;
            await comment.save();
            await userReaction.save();
          }
        } else {
          const createReaction = new CommentReaction({
            commentId,
            reaction: reaction,
            userId: req.userId,
          });

          comment.reactionCount[reaction]++;
          await createReaction.save();
          await comment.save();
        }

        return { Success: true };
      } catch (err) {
        console.log(err);

        throw new GraphQLError("Internal Server Error", {
          extensions: { code: 500 },
        });
      }
    },
  },
};

const helperFunctions = {
  async extractMentions(text) {
    const usernameRegex = /@(\w+)/g;
    const mentions = [];
    const usernames = text.match(usernameRegex);

    if (usernames) {
      for (const username of usernames) {
        const cleanUsername = username.slice(1);
        const user = await User.findOne({ username: cleanUsername });
        if (user) {
          mentions.push({ userId: user._id, username: cleanUsername });
        }
      }
    }

    return mentions;
  },

  formatText(text, mentions) {
    let formattedText = text;
    for (const mention of mentions) {
      const mentionTag = `@${mention.username}`;
      formattedText = formattedText.replace(
        new RegExp(`@${mention.username}`, "g"),
        `<a href="/profile/${mention.username}" class="mention">${mentionTag}</a>`
      );
    }

    return formattedText;
  },
};

module.exports = reactionResolver;
