https://best-padel.vercel.app/

![image](https://github.com/user-attachments/assets/aabc7dc5-d3e5-4731-9adc-630e1b2ddf59)

el proceso despues de un tiempo de inactividad puede tardar de 30-60 segundos

### Troubleshooting

If deployment fails with an error like:

```
npm ERR! code ETARGET
npm ERR! notarget No matching version found for react-leaflet@^4.4.0
```

Edit `frontend/package.json` to use a valid `react-leaflet` version (for example `^4.3.0`), reinstall dependencies and redeploy.
