const express = require("express");
const { Op } = require("sequelize");
const { Posts } = require("../models");
const authMiddleware = require("../middlewares/auth-middleware");
const router = express.Router();

// 게시글 생성
// 회원가입 후 로그인을 했을때만 생성 가능
router.post("/posts", authMiddleware, async (req, res) => {
  try {
    const { userId } = res.locals.user;
    const nickname = res.locals.userNickname;

    const { title, content } = req.body;

    if (!title || !content) {
      res.status(412).json({
        message: "제목 또는 내용의 형식이 일치하지 않습니다.",
      });
      return;
    }

    const createPosts = await Posts.create({
      UserId: userId,
      Nickname: nickname,
      title,
      content,
    });

    res.status(201).json({ message: "게시글 생성완료" });
  } catch (err) {
    res.status(412).json({
      message: "데이터 형식이 올바르지 않습니다",
    });
  }
});

// 게시글 전체조회
router.get("/posts", async (req, res) => {
  const showPost = await Posts.findAll({
    attributes: ["postId", "userId", "title", "nickname", "createdAt", "updatedAt"],
    order: [["createdAt", "DESC"]],
  });

  try {
    if (!showPost.length) {
      return res.status(404).json({ message: "게시글이 없습니다." });
    }

    res.status(200).json({
      showPost: showPost,
    });
  } catch (err) {
    res.status(400).json({
      message: "게시글 조회에 실패하였습니다.",
    });
  }
});

// 게시글 상세 조회
router.get("/posts/:postId", async (req, res) => {
  const { postId } = req.params;
  const result = await Posts.findOne({
    attributes: ["postId", "userId", "title", "nickname", "content", "createdAt", "updatedAt"],
    where: { postId },
  });
  try {
    if (!result) {
      return res.status(404).json({ message: "해당 ID로 작성된 게시글이 없습니다." });
    }

    res.status(200).json({
      Detail: result,
    });
  } catch (err) {
    res.status(400).json({
      message: "게시글 조회에 실패하였습니다.",
    });
  }
});

//게시글 수정
router.put("/posts/:postId", authMiddleware, async (req, res) => {
  const { postId } = req.params;
  const { userId } = res.locals.user;
  const { title, content } = req.body;

  try {
    const modifyPost = await Posts.findOne({ where: { postId } });
    if (!modifyPost) {
      return res.status(404).json({ message: "해당 게시글을 찾을 수 없습니다." });
    } else if (!title || !content) {
      return res.status(400).json({ message: "데이터를 입력해주세요." });
    } else if (modifyPost.UserId !== userId) {
      return res.status(401).json({ message: "수정권한이 없습니다." });
    } else {
      await Posts.update(
        { title, content },
        { where: { [Op.and]: [{ postId }, { UserId: userId }] } }
      );
      res.status(201).json({
        message: "게시글 수정 완료",
        Detail: {
          title: modifyPost.title,
          content: modifyPost.content,
          updatedAt: modifyPost.updatedAt,
        },
      });
    }
  } catch (err) {
    res.status(400).json({
      message: "게시글 수정에 실패하였습니다.",
    });
  }
});

// 게시글 삭제
router.delete("/posts/:postId", authMiddleware, async (req, res) => {
  const { postId } = req.params;
  const { userId } = res.locals.user;

  try {
    const deletePost = await Posts.findOne({ where: { postId } });
    if (!deletePost) {
      return res.status(404).json({ message: "해당 게시글을 찾을 수 없습니다." });
    } else if (deletePost.UserId !== userId) {
      return res.status(400).json({ message: "삭제권한이 없습니다." });
    } else {
      await Posts.destroy({
        where: {
          [Op.and]: [{ postId }, { UserId: userId }],
        },
      });
      res.status(204).json();
    }
  } catch (err) {
    res.status(400).json({
      message: "게시글 삭제에 실패하였습니다.",
    });
  }
});

module.exports = router;
