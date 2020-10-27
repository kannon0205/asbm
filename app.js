const express = require('express');
const app = express();
const mysql = require('mysql');
const Sequelize = require('sequelize');
const config = require('./config/config');

const http = require('http');


// Sequelize インスタンス
const sequelize = new Sequelize({
  dialect: 'mysql',
  timezone: '+09:00'
});


const passport = require('./auth');
const session = require('express-session');
const flash = require('connect-flash');
const {
  check,
  validationResult
} = require('express-validator');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const client = require('cheerio-httpcli');

//model
const User = require('./models').User;
const Bookmark = require('./models').Bookmark;
const Tag = require('./models').Tag;
const Tag_map = require('./models').Tag_map;
const Test = require('./models').Test;

app.use(express.static('public'));

//暗号化につかうキー
const APP_KEY = 'YOUR-SECRET-KEY';

//ミドルウェア
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(cookieParser());
app.use(flash());
app.use(session({
  secret: 'YOUR-SECRET-STRING',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

const authMiddleware = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else if (req.cookies.remember_me) {
    const [rememberToken, hash] = req.cookies.remember_me.split('|');
    User.findAll({
      where: {
        rememberToken: rememberToken
      }
    }).then(users => {
      for (let i in users) {
        const user = users[i];
        const verifyingHash = crypto.createHmac('sha256', APP_KEY)
          .update(user.id + '-' + rememberToken)
          .digest('hex');
        if (hash === verifyingHash) {
          return req.login(user, () => {

            // セキュリティ的はここで remember_me を再度更新すべき

            next();
          });
        }
      }
      res.redirect(302, '/login');
    });
  } else {
    res.redirect(302, '/login');
  }
};

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'ZgYddWr3FWP5',
  database: 'asb',
  timezone: "+09:00"
});

connection.connect((err) => {
  if (err) {
    console.log('error connecting: ' + err.stack);
    return;
  }
  console.log('success');
});

//-----------------------------------------//

//----------ログインここから----------//
app.get('/logout', (req, res) => {
  res.clearCookie('remember_me');
  req.logout();
  res.redirect('/login');
});

app.get('/login', (req, res) => {

  const errorMessage = req.flash('error').join('<br>');
  res.render('user/login.ejs', {
    errorMessage: errorMessage,
    correctMessage: '',
  });
});

app.post('/login',
  passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true,
    badRequestMessage: '「メールアドレス」と「パスワード」は必須入力です。',
    correctMessage: ''
  }),
  (req, res, next) => {

    if (!req.body.remember) { // 次回もログインを省略しない場合

      res.clearCookie('remember_me');
      return next();

    }

    const user = req.user;
    const rememberToken = crypto.randomBytes(20).toString('hex'); // ランダムな文字列
    const hash = crypto.createHmac('sha256', APP_KEY)
      .update(user.id + '-' + rememberToken)
      .digest('hex');
    user.rememberToken = rememberToken;
    user.save();

    res.cookie('remember_me', rememberToken + '|' + hash, {
      path: '/',
      maxAge: 5 * 365 * 24 * 60 * 60 * 1000 // 5年
    });

    return next();

  },
  (req, res) => {

    res.redirect('/timeline/' + req.user.id);

  }
);
//----------ログインここまで----------//

//----------新規登録ここから----------//

const registrationValidationRules = [
  check('name')
  .not().isEmpty().withMessage('この項目は必須入力です。')
  .isLength({
    min: 4,
    max: 20
  }).withMessage('4文字から20文字にしてください。')
  .trim()
  .escape(),
  check('email')
  .not().isEmpty().withMessage('この項目は必須入力です。')
  .isEmail().withMessage('有効なメールアドレス形式で指定してください。')
  .trim()
  .escape(),
  check('password')
  .not().isEmpty().withMessage('この項目は必須入力です。')
  .isLength({
    min: 8,
    max: 25
  }).withMessage('8文字から25文字にしてください。')
  .trim()
  .escape()
  .custom((value, {
    req
  }) => {
    if (req.body.password !== req.body.passwordConfirmation) {
      throw new Error('パスワード（確認）と一致しません。');
    }
    return true;
  })
];

app.get('/register', (req, res) => {
  res.render('user/register.ejs', {
    name: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    resultName: '',
    resultEmail: '',
    resultPassword: '',
    correctMessage: '',
  });
});

app.post('/register', registrationValidationRules, (req, res) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {

    const errors_array = errors.array();
    const resultName = errors_array.find((v) => v.param === 'name');
    const resultEmail = errors_array.find((v) => v.param === 'email');
    const resultPassword = errors_array.find((v) => v.param === 'password');

    res.render('user/register.ejs', {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirmation: req.body.passwordConfirmation,
      resultName: resultName,
      resultEmail: resultEmail,
      resultPassword: resultPassword,
      correctMessage: ''
    });

  } else {
    User.findOrCreate({
      where: {
        email: req.body.email
      },
      defaults: {
        name: req.body.name,
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8))
      }
    }).then(([user, created]) => {
      if (created) {
        res.render('user/login.ejs', {
          correctMessage: '登録が成功しました',
          errorMessage: ''
        });
      } else {
        res.render('user/register.ejs', {
          name: req.body.name,
          email: req.body.email,
          password: req.body.password,
          passwordConfirmation: req.body.passwordConfirmation,
          resultName: '',
          resultEmail: '',
          resultPassword: '',
          correctMessage: '既に登録されています'
        });
      }
    });
  }


});
//----------新規登録ここまで----------//



app.get('/test', authMiddleware, (req, res) => {

  Bookmark.findOne({
    where: {
      id: 3
    },
    include: [
      {
        model: Tag,
        as: 'bookmarkTags'
      }
    ]
  }).then(bookmarkData => {
    const jsonBookmarks = JSON.stringify(bookmarkData);
    const user_bookmark = JSON.parse(jsonBookmarks);
    let tag = ''

    user_bookmark.bookmarkTags.forEach(bookmarkTag => {
      tag = tag + bookmarkTag.name + ' ';
    })

    console.log(tag);
    res.send('いえい');
  });

});



app.get('/bookmark/create', authMiddleware, (req, res) => {

  Tag.findAll({
    attributes: ['name'],
    include: [
      {
        model: Tag_map,
        where: {
          user_id: req.user.id
        },
        attributes: ['createdAt']
      }
    ],
    order: [
      [Tag_map, 'createdAt', 'DESC']
    ]
  }).then(tags => {

    const jsonResult = JSON.stringify(tags);
    const results = JSON.parse(jsonResult);

    res.render('bookmark/create.ejs', {
      current_user: req.user,
      url: '',
      memo: '',
      tags: '',
      resultUrl: '',
      resultMemo: '',
      resultTags: '',
      public: '1',
      correctMessage: '',
      user_tags: results
    });

  });

});

const createUserValidationRules = [
  check('url')
  .not().isEmpty().withMessage('この項目は必須入力です。')
  .isURL({
    protocols: ['http', 'https', 'ftp'],
    require_protocol: false,
  }).withMessage('有効なURLを指定してください。')
  .isLength({
    min: 8,
    max: 200
  }).withMessage('8文字から200文字にしてください。')
  .trim(),
//  .escape(),
  check('memo')
  .isLength({
    min: 0,
    max: 40
  }).withMessage('40文字以内にしてください。')
  .trim()
  .escape(),
  check('tags')
    .trim()
    .escape(),
];

app.post('/bookmark/create', authMiddleware, createUserValidationRules, (req, expressResponse, next) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {

    const errors_array = errors.array();
    const resultUrl = errors_array.find((v) => v.param === 'url');
    const resultMemo = errors_array.find((v) => v.param === 'memo');
    const resultTags = errors_array.find((v) => v.param === 'tags');

    expressResponse.render('bookmark/create.ejs', {
      current_user: req.user,
      url: req.body.url,
      memo: req.body.memo,
      tags: req.body.tags,
      resultUrl: resultUrl,
      resultMemo: resultMemo,
      resultTags: resultTags,
      public: req.body.public,
      correctMessage: ''
    });

  } else {

    const ogp = req.body.url;

    client.fetch(ogp, function (err, $, res, body) {
      if (err) {
        next(err)
        return;
      }

      const result = {
        exists: false,
        title: "",
        site_name: ""
      }

      const ogTitleQuery = $("meta[property='og:title']");

      if (ogTitleQuery.length > 0) {
        result.exists = true;
        result.title = $("meta[property='og:title']").attr("content");
        result.site_name = $("meta[property='og:site_name']").attr("content");
      } else {
        result.title = $("head title").text();
      }

      const tags = req.body.tags;
      const rule = /\s+/;
      const tags_array = tags.split(rule);

      Bookmark.findOrCreate({
        where: {
          url: req.body.url
        },
        defaults: {
          url: req.body.url,
          title: result.title,
          site_name: result.site_name,
          memo: req.body.memo,
          public: req.body.public,
          user_id: req.user.id
        },
        raw: true
      }).then(([bookmark, created]) => {
        if (created) {
          tags_array.forEach(tag => {

            Tag.findOrCreate({
              where: {
                name: tag
              },
              defaults: {
                name: tag
              },
              raw: true
            }).then(([data, created]) => {

              Tag_map.findOrCreate({
                where: {
                  tag_id: data.id,
                  bookmark_id: bookmark.id,
                  user_id: req.user.id
                },
                defaults: {
                  tag_id: data.id,
                  bookmark_id: bookmark.id,
                  user_id: req.user.id
                },
                raw: true
              });
            });
          });

          expressResponse.redirect('/bookmark/create');

        } else {

          expressResponse.render('bookmark/create.ejs', {
            current_user: req.user,
            url: req.body.url,
            memo: req.body.memo,
            tags: req.body.tags,
            resultUrl: '',
            resultMemo: '',
            resultTags: '',
            public: req.body.public,
            correctMessage: '既に登録されています'
          });

        }

      });
    });
  }

});

app.post('/mybookmark/edit/:bookmark_id', authMiddleware, createUserValidationRules, (req, expressResponse, next) => {

  Bookmark.findOne({
    where: {
      id: req.params.bookmark_id
    },
    include: [
      {
        model: Tag,
        as: 'bookmarkTags'
      }
    ]
  }).then(bookmarkData => {

    const jsonBookmarks = JSON.stringify(bookmarkData);
    const user_bookmark = JSON.parse(jsonBookmarks);
    //bookmarkData変換

    if (user_bookmark.user_id === req.user.id) {

      Tag.findAll({
        attributes: ['name'],
        include: [
          {
            model: Tag_map,
            where: {
              user_id: req.user.id
            },
            attributes: ['createdAt']
          }
        ],
        order: [
          [Tag_map, 'createdAt', 'DESC']
        ]
      }).then(tags => {

        const jsonResult = JSON.stringify(tags);
        const results = JSON.parse(jsonResult);
        //user_tags定義

        const errors = validationResult(req);

        if (!errors.isEmpty()) {

          const errors_array = errors.array();
          const resultUrl = errors_array.find((v) => v.param === 'url');
          const resultMemo = errors_array.find((v) => v.param === 'memo');
          const resultTags = errors_array.find((v) => v.param === 'tags');

          expressResponse.render('bookmark/create.ejs', {
            current_user: req.user,
            user_bookmark: user_bookmark,
            url: req.body.url,
            memo: req.body.memo,
            tags: req.body.tags,
            resultUrl: resultUrl,
            resultMemo: resultMemo,
            resultTags: resultTags,
            public: req.body.public,
            correctMessage: '',
            user_tags: results
          });
          //validation通過失敗

        } else {

          const ogp = req.body.url;

          client.fetch(ogp, function (err, $, res, body) {
            if (err) {
              next(err)
              return;
            }

            const result = {
              exists: false,
              title: "",
              site_name: ""
            }

            const ogTitleQuery = $("meta[property='og:title']");

            if (ogTitleQuery.length > 0) {
              result.exists = true;
              result.title = $("meta[property='og:title']").attr("content");
              result.site_name = $("meta[property='og:site_name']").attr("content");
            } else {
              result.title = $("head title").text();
            }

            const tags = req.body.tags;
            const rule = /\s+/;
            const tags_array = tags.split(rule);

            Bookmark.update({
              url: req.body.url,
              title: result.title,
              site_name: result.site_name,
              memo: req.body.memo,
              public: req.body.public,
              user_id: req.user.id
            }, {
              where: {
                id: user_bookmark.id
              }
            }).then(() => {

              Tag_map.destroy({
                where: {
                  bookmark_id: user_bookmark.id
                }
              }).then(() => {

                tags_array.forEach(tag => {

                  Tag.findOrCreate({
                    where: {
                      name: tag
                    },
                    defaults: {
                      name: tag
                    },
                    raw: true
                  }).then(data => {
                    Tag_map.findOrCreate({
                      where: {
                        tag_id: data[0].id,
                        bookmark_id: user_bookmark.id,
                        user_id: req.user.id
                      },
                      defaults: {
                        tag_id: data[0].id,
                        bookmark_id: user_bookmark.id,
                        user_id: req.user.id
                      },
                      raw: true
                    });

                    //Tag作成チェック
                  });
                  //繰り返し処理
                });

                expressResponse.redirect('/mybookmark');

                //Tag_mapリセット
              });

              //Bookmark更新
            });

            //fetchここまで
          });

          //validation通過成功
        }
        //user_tag取得
      });

    } else {
      expressResponse.redirect('/mybookmark');
      //ifブックマークユーザーチェック
    }

    //bookmark.findOne
  });
});

app.get('/mybookmark/edit/:bookmark_id', authMiddleware, (req, res) => {

  Bookmark.findOne({
    where: {
      id: req.params.bookmark_id
    },
    include: [
      {
        model: Tag,
        as: 'bookmarkTags'
      }
    ]
  }).then(bookmarkData => {

    Tag.findAll({
      attributes: ['name'],
      include: [
        {
          model: Tag_map,
          where: {
            user_id: req.user.id
          },
          attributes: ['createdAt']
        }
      ],
      order: [
        [Tag_map, 'createdAt', 'DESC']
      ]
    }).then(tags => {

      const jsonResult = JSON.stringify(tags);
      const results = JSON.parse(jsonResult);

      const jsonBookmarks = JSON.stringify(bookmarkData);
      const user_bookmark = JSON.parse(jsonBookmarks);
      let tag = ''

      user_bookmark.bookmarkTags.forEach(bookmarkTag => {
        tag = tag + bookmarkTag.name + ' ';
      })

      if (user_bookmark.user_id === req.user.id) {

        const publicString = user_bookmark.public + ''

        res.render('bookmark/edit.ejs', {
          current_user: req.user,
          user_bookmark: user_bookmark,
          url: user_bookmark.url,
          memo: user_bookmark.memo,
          tags: tag,
          resultUrl: '',
          resultMemo: '',
          resultTags: '',
          public: publicString,
          correctMessage: '',
          user_tags: results
        });

      } else {
        res.redirect('/mybookmark');
      }

    });
  });

});

app.post('/mybookmark/delete/:bookmark_id', authMiddleware, (req, res) => {

  Bookmark.findOne({
    where: {
      id: req.params.bookmark_id
    },
    include: [
      {
        model: Tag,
        as: 'bookmarkTags'
      }
    ]
  }).then(delBookmark => {

    const jsonBookmarks = JSON.stringify(delBookmark);
    const user_bookmark = JSON.parse(jsonBookmarks);

    if (user_bookmark.user_id === req.user.id) {

      Tag_map.destroy({
        where: {
          bookmark_id: user_bookmark.id
        },
        raw: true
      }).then(() => {
        delBookmark.destroy();
        res.redirect('/mybookmark');
      });

    } else {
      res.redirect('/mybookmark');
    }

  });
});

app.get('/mybookmark/delete/:bookmark_id', authMiddleware, (req, res) => {

  Bookmark.findOne({
    where: {
      id: req.params.bookmark_id
    },
    include: [
      {
        model: Tag,
        as: 'bookmarkTags'
      }
    ]
  }).then(result => {

    const jsonBookmarks = JSON.stringify(result);
    const user_bookmark = JSON.parse(jsonBookmarks);

    if (user_bookmark.user_id === req.user.id) {

      res.render('bookmark/delete.ejs', {
        current_user: req.user,
        user_bookmark: user_bookmark
      });

    } else {
      res.redirect('/mybookmark');
    }

  });
});

app.get('/mybookmark', authMiddleware, (req, res) => {

  Bookmark.findAll({
    where: {
      user_id: req.user.id
    },
    order: [
      ['createdAt', 'DESC']
    ],
    include: [
      {
        model: Tag,
        as: 'bookmarkTags'
      }
    ]
  }).then(result => {

    const jsonBookmarks = JSON.stringify(result);
    const user_bookmarks = JSON.parse(jsonBookmarks);

    res.render('bookmark/mybookmark.ejs', {
      current_user: req.user,
      user_bookmarks: user_bookmarks
    });

  });
});

app.post('/user/:id/edit', authMiddleware, registrationValidationRules, (req, res) => {

  User.update({
    name: req.body.name
  }, {
    where: {
      id: 1
    }
  }).then(() => {
    User.findByPk(req.user.id).then(user => {
      req.login(user, () => res.redirect('/user/' + req.user.id));
    });
  });
});

app.get('/user/:id', authMiddleware, (req, res) => {

  const result = String(req.user.id);

  User.findByPk(req.params.id).then(user => {

    if (req.params.id === result) {
      res.render('user/mypage.ejs', {
        current_user: req.user
      });
    } else if (user) {
      res.render('user/show.ejs', {
        current_user: req.user,
        other_user: user
      });

    } else {
      res.render('user/mypage.ejs', {
        current_user: req.user
      });
    }

  });
});

app.get('/', authMiddleware, (req, res) => {

  res.render('timeline/show.ejs', {
    current_user: req.user
  });
});

http.createServer(function (request, response) {
  response.writeHead(200, {
    'Content-Type': 'text/plain'
  });
  response.end('Hello, World\n');
}).listen(process.env.PORT, process.env.IP);

//app.listen(3000);
