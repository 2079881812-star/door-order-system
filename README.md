# 门业排单助手

当前功能版本 **v1.9.2**。本机离线使用：粘贴折叠门订单文字，识别尺寸和客户信息，计算用料，预览或导出 WPS 表格。

这是从当前使用版整理出的独立源码仓库。解析和计算功能保留；内置示例中的真实姓名、电话、详细地址已替换为演示数据。包内没有原始订单工作簿、用户草稿、截图或历史核查数据。生产参数和业务公式保存在源码中。

## 直接运行

打开 **`dist/index.html`** 即可，无需安装、联网或启动服务器。订单在本机页面内处理，草稿需手动保存。具体操作见 [使用说明](docs/使用说明.txt)。

复制功能受到浏览器剪贴板权限支持情况影响；页面保留纯文本复制及 `.xlsx` 导出。

## 开发与验证

需要 Node.js 20 或更高版本，无第三方依赖，无需 `npm install`。在仓库目录运行：

```sh
node scripts/build.mjs
node scripts/test.mjs
node scripts/build.mjs --check
```

也可以使用 `npm run build`、`npm test`、`npm run check`。测试命令会先重新构建页面。

- `build`：把页面、规则、计算引擎及空白表格模板合成 `dist/index.html`。
- `test`：运行尺寸识别、单位、选片、多门、开启方式、合并、页面交互及 XLSX 导出检查。
- `check`：只比较已提交页面是否与源码一致，不修改文件。

页面交互测试使用内存 DOM；导出测试检查实际 XLSX 字节、公式与合并范围，不等同于浏览器或 WPS 应用内测试。

## 目录

```text
src/
  app.html                页面、样式及订单操作逻辑
  engine.js               文字解析、计算、复制和 XLSX 导出
  production-ui.js        生产参数编辑与计算展示
  rules.json              当前生产规则及公式来源
  workbook-template.json  空白 XLSX 的 XML、列布局和样式
scripts/
  build.mjs               无外部依赖的单文件构建
  test.mjs                测试入口
tests/                    回归测试及演示数据
docs/使用说明.txt
dist/index.html           已构建的可运行页面，纳入 Git
package.json
.gitignore
.gitattributes
```

修改页面布局时编辑 `src/app.html`；修改识别和计算时编辑 `src/engine.js`；生产参数在 `src/rules.json`。修改后重新构建并提交源码和 `dist/index.html`。不要直接修改构建产物。

页面版本由 `package.json` 的 `version` 统一填入；`rules.json.version` 目前为 `1.9`，是业务规则及草稿迁移版本，不等同于页面补丁版本。页面底部保留历史更新日志，发布功能修改时同步补充。

`workbook-template.json` 已包含导出所需的三个空白表格和样式，运行和构建都不依赖 WPS、原始订单文件、Python 或模板生成工具。

## 当前业务规则

- 支持宽高前后标注、反向顺序、单位换算及“n个门”拆单；无方向的数字对默认宽×高。
- 净高默认总高减 0.08 米；JF/JJ 型号、片宽和特殊半片规格沿用已确认规则。
- 单开：2 半片、修正 0.09 米；双开：4 半片、修正 0.14 米；左右单开：2 半片、修正 0.16 米。
- 辅片固定为 0；选择绝对误差更小的大片数，误差显示“多/少xx公分”。
- 复制表格 14 列；导出“排单、订单明细、生产计算”三张表并保留公式。
- 排单日期和目的地分别合并相邻的相同内容；商城标记、手填覆盖、草稿保存恢复及更新日志保留。

## 同步到 Git

将本目录作为仓库根目录。新建仓库时执行：

```sh
git init
git add .
git commit -m "导入门业排单助手 v1.9.2"
git branch -M main
```

在托管平台创建空仓库，将下方地址替换成你的仓库地址：

```sh
git remote add origin "你的仓库地址"
git push -u origin main
```

如果已有仓库，把本目录内容复制到现有仓库中，再按该仓库的分支流程提交即可。`.gitignore` 已排除本地订单目录、草稿常用文件名、导出的 Excel 和临时文件。源码包尚未连接远程仓库，也没有推送。
