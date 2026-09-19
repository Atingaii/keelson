# Rules index

每个作用域一行：一个路径 glob、一个箭头、本目录中的 rule 文件。代理只读取 glob 命中它即将改动文件的那些 rule。始终适用的 rule 用 `**`。

- `**` → general.md — 适用于所有变更
