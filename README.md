# WikiWiki Sync
日本のwikiサービスwikiwikiをObsidianから操作します。
apiを使用する為、事前に[wikiのapiキーとシークレットを発行](https://zawazawa.jp/wikiwiki-rest-api/topic/5)してください。
## Command
### Get all pages
wikiの全ページを`/`以下に読み込みます。  
読み込んだファイルにはアップデート処理のための日時が付与されます。

ファイルが無ければ新規作成、あればアップデートします。  

ソースをそのまま入力するため、wiki記法は正しく表示されません。  
階層化されている場合はその階層名でフォルダを作ります。  
### Put Page
現在開いているページを同名のwikiページに書き込みます。  
wikiwiki側で既に変更されている場合はエラーを出します。  
ツールバーに追加されたボタンから呼び出すこともできます。
## Settings
### wiki name
wikiURLのユニーク部分を入力します。必須。  
例えば以下のURLであればtoho_eclipseを入力します。  
https://wikiwiki.jp/toho_eclipse/
### api key
apiキーを入力します。必須。
### api secret
シークレットを入力します。  
Obsidianの性質上、シークレットはdata.jsonに**平文**で保存されます。  
気になる場合はPostmanなどでトークンを発行し、api tokenに貼り付けてください。
### api token
トークンが入ります。  
keyとsecretがある場合は自動で入力されるため、変更の必要はありません。
