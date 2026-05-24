import { useEffect, useMemo, useState } from "react";

import type { QueueOrder } from "@coffee-shop/shared/contracts/api";
import type { StaffUser } from "@coffee-shop/shared/domain/types";

import { PickupCalloutPanel } from "../components/PickupCalloutPanel";
import { QueueConflictMessage } from "../components/QueueConflictMessage";
import { QueueOrderCard } from "../components/QueueOrderCard";
import { ApiClientError } from "../services/apiClient";
import {
  cancelBeverage,
  completeBeverage,
  completeOrder,
  confirmPickup
} from "../services/fulfillmentApi";
import { claimQueueOrder, getQueueOrders } from "../services/queueApi";

interface BrewQueuePageProps {
  staff: StaffUser;
}

export function BrewQueuePage({ staff }: BrewQueuePageProps) {
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [pickupSuccess, setPickupSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getQueueOrders()
      .then((response) => {
        if (active) {
          setOrders(response.orders);
        }
      })
      .catch((caught) => {
        setError(caught instanceof ApiClientError ? caught.message : "Unable to load brew queue.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const waitingOrders = useMemo(
    () => orders.filter((order) => order.status === "queued"),
    [orders]
  );
  const inProgressOrders = useMemo(
    () => orders.filter((order) => order.status === "in_progress"),
    [orders]
  );
  const completedOrders = useMemo(
    () => orders.filter((order) => order.status === "completed"),
    [orders]
  );

  function replaceOrder(updatedOrder: QueueOrder) {
    setOrders((current) =>
      current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
    );
  }

  async function claimOrder(orderId: string) {
    setClaimingOrderId(orderId);
    setError(null);
    setConflict(null);

    try {
      const claimedOrder = await claimQueueOrder(orderId);
      replaceOrder(claimedOrder);
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 409) {
        setConflict(caught.message);
      } else {
        setError(caught instanceof ApiClientError ? caught.message : "Unable to claim order.");
      }
    } finally {
      setClaimingOrderId(null);
    }
  }

  async function completeOrderBeverage(orderId: string, beverageId: string) {
    setBusyActionId(beverageId);
    setError(null);
    setConflict(null);

    try {
      replaceOrder(await completeBeverage(orderId, beverageId));
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Unable to complete beverage.");
    } finally {
      setBusyActionId(null);
    }
  }

  async function cancelOrderBeverage(orderId: string, beverageId: string) {
    setBusyActionId(beverageId);
    setError(null);
    setConflict(null);

    try {
      replaceOrder(await cancelBeverage(orderId, beverageId, "Unavailable"));
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Unable to cancel beverage.");
    } finally {
      setBusyActionId(null);
    }
  }

  async function markOrderReady(orderId: string) {
    setBusyActionId(orderId);
    setError(null);
    setConflict(null);

    try {
      replaceOrder(await completeOrder(orderId));
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 409) {
        setConflict(caught.message);
      } else {
        setError(caught instanceof ApiClientError ? caught.message : "Unable to mark order ready.");
      }
    } finally {
      setBusyActionId(null);
    }
  }

  async function confirmOrderPickup(orderId: string) {
    setBusyActionId(orderId);
    setError(null);
    setConflict(null);

    try {
      const pickedUpOrder = await confirmPickup(orderId);
      setOrders((current) => current.filter((order) => order.id !== pickedUpOrder.id));
      setPickupSuccess(`Pickup confirmed for #${pickedUpOrder.dailyOrderNumber}.`);
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : "Unable to confirm pickup.");
    } finally {
      setBusyActionId(null);
    }
  }

  return (
    <section className="brew-queue-layout" aria-label="Brew queue">
      <header className="counter-header">
        <div>
          <h2>Brew queue</h2>
          <p>Claim waiting orders and track active brewing work</p>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {conflict ? <QueueConflictMessage message={conflict} /> : null}
      {pickupSuccess ? <p className="pickup-success">{pickupSuccess}</p> : null}

      {loading ? (
        <p className="empty-state">Loading brew queue.</p>
      ) : (
        <div className="queue-workspace">
          {completedOrders.length > 0 ? (
            <section className="pickup-callouts" aria-label="Ready for pickup">
              {completedOrders.map((order) => (
                <PickupCalloutPanel
                  key={order.id}
                  order={order}
                  confirming={busyActionId === order.id}
                  onConfirmPickup={confirmOrderPickup}
                />
              ))}
            </section>
          ) : null}

          <div className="queue-columns">
          <section className="queue-column" aria-labelledby="waiting-orders-heading">
            <div className="queue-column-heading">
              <h3 id="waiting-orders-heading">Waiting</h3>
              <span>{waitingOrders.length}</span>
            </div>
            {waitingOrders.length > 0 ? (
              waitingOrders.map((order) => (
                <QueueOrderCard
                  key={order.id}
                  order={order}
                  currentStaff={staff}
                  claiming={claimingOrderId === order.id}
                  onClaim={claimOrder}
                />
              ))
            ) : (
              <p className="empty-state">No waiting orders.</p>
            )}
          </section>

          <section className="queue-column" aria-labelledby="in-progress-orders-heading">
            <div className="queue-column-heading">
              <h3 id="in-progress-orders-heading">In progress</h3>
              <span>{inProgressOrders.length}</span>
            </div>
            {inProgressOrders.length > 0 ? (
              inProgressOrders.map((order) => (
                <QueueOrderCard
                  key={order.id}
                  order={order}
                  currentStaff={staff}
                  claiming={false}
                  busyActionId={busyActionId}
                  onClaim={claimOrder}
                  onCancelBeverage={cancelOrderBeverage}
                  onCompleteBeverage={completeOrderBeverage}
                  onCompleteOrder={markOrderReady}
                />
              ))
            ) : (
              <p className="empty-state">No orders in progress.</p>
            )}
          </section>
          </div>
        </div>
      )}
    </section>
  );
}
