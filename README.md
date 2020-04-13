# DS skeleton

The easiest way to install DS front-end skeleton is to use the command line tool. You can run this command anywhere in a new empty repository or within an existing repository, it will create a new directory containing basic front-end code.


```
npx @django-stars/skeleton init [projectName] [folderName]
```
Example
```
npx @django-stars/skeleton init ds-site client
```
or
```
npx @django-stars/skeleton init
```

If you do not specify name or template, it will prompt you for them.

Editionally it will prompt few more information:
 - Git repository url (that will be used only for package.json to setup git information)
 - Back-end url (this will change default env configuration to proxy dev server to localhost)
 - Template
