# Load testing instructions

```
TIME=30m
RPS=5
hey -z $TIME -q $RPS http://load-balancer-endpoint
```
